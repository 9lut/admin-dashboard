import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountSchema, roleSchema, selfChangeError, uniqueDepartments, updateAccountSchema } from '../src/lib/inputs/accountInput.ts';

const valid = { email: ' Somchai@Example.com ', password: 'secret123', firstName: 'สมชาย', lastName: 'ใจดี' };

test('สร้างบัญชี: อีเมลถูกตัดช่องว่างและเป็นตัวพิมพ์เล็ก', () => {
  const r = createAccountSchema.parse(valid);
  assert.equal(r.email, 'somchai@example.com');
});

test('สร้างบัญชี: รหัสผ่านต้องอย่างน้อย 8 ตัว', () => {
  assert.throws(() => createAccountSchema.parse({ ...valid, password: '1234567' }));
});

test('สร้างบัญชี: ชื่อว่าง/อีเมลผิดรูปแบบไม่ผ่าน', () => {
  assert.throws(() => createAccountSchema.parse({ ...valid, firstName: '   ' }));
  assert.throws(() => createAccountSchema.parse({ ...valid, email: 'not-an-email' }));
});

test('บทบาทรับเฉพาะ user / admin / superadmin', () => {
  assert.equal(roleSchema.parse({ role: 'admin' }).role, 'admin');
  assert.throws(() => roleSchema.parse({ role: 'owner' }));
  assert.throws(() => updateAccountSchema.parse({ role: 'root' }));
});

test('ฝ่ายสูงสุด 20 ฝ่าย และชื่อฝ่ายห้ามว่าง', () => {
  assert.throws(() => updateAccountSchema.parse({ departments: Array.from({ length: 21 }, (_, i) => `ฝ่าย${i}`) }));
  assert.throws(() => updateAccountSchema.parse({ departments: [' '] }));
});

test('uniqueDepartments ตัดซ้ำและช่องว่าง', () => {
  assert.deepEqual(uniqueDepartments(['ก', ' ก ', 'ข', '']), ['ก', 'ข']);
  assert.equal(uniqueDepartments(undefined), undefined);
});

test('ห้ามลดบทบาทหรือลบบัญชีตัวเอง แต่ทำกับคนอื่นได้', () => {
  assert.match(selfChangeError({ actorId: 'a', targetId: 'a', newRole: 'admin' }), /ลดบทบาท/);
  assert.match(selfChangeError({ actorId: 'a', targetId: 'a', deleting: true }), /ลบบัญชี/);
  assert.equal(selfChangeError({ actorId: 'a', targetId: 'a', newRole: 'superadmin' }), null);
  assert.equal(selfChangeError({ actorId: 'a', targetId: 'b', newRole: 'user' }), null);
  assert.equal(selfChangeError({ actorId: 'a', targetId: 'b', deleting: true }), null);
});

test('รหัสผ่านชั่วคราว: รูปแบบ xxxx-xxxx-xxxx ไม่มีตัวที่สับสน และไม่ซ้ำกัน', async () => {
  const { generateTempPassword } = await import('../src/lib/inputs/accountInput.ts');
  const list = Array.from({ length: 200 }, () => generateTempPassword());
  for (const p of list) {
    assert.match(p, /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    assert.doesNotMatch(p, /[0O1lI]/);
  }
  assert.equal(new Set(list).size, list.length);
  assert.ok(generateTempPassword().length >= 8, 'ผ่านเกณฑ์รหัสผ่านขั้นต่ำ 8 ตัว');
});

test('สร้างบัญชีโดยไม่ส่งรหัสผ่านได้ (ระบบสร้างให้)', () => {
  const r = createAccountSchema.parse({ email: 'a@b.co', firstName: 'ก', lastName: 'ข' });
  assert.equal(r.password, undefined);
});

test('จัดการหลายคน: ตรวจ action/ค่า และจำกัดจำนวน', async () => {
  const { bulkSchema } = await import('../src/lib/inputs/accountInput.ts');
  assert.equal(bulkSchema.parse({ action: 'add-department', ids: ['u1'], value: ' ฝ่าย ก ' }).value, 'ฝ่าย ก');
  assert.throws(() => bulkSchema.parse({ action: 'set-role', ids: ['u1'], value: 'owner' }));
  assert.throws(() => bulkSchema.parse({ action: 'delete-all', ids: ['u1'], value: 'x' }));
  assert.throws(() => bulkSchema.parse({ action: 'add-department', ids: [], value: 'x' }));
  assert.throws(() => bulkSchema.parse({ action: 'add-department', ids: Array.from({ length: 201 }, (_, i) => 'u' + i), value: 'x' }));
});
