import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedMenus, canAccessPath, cleanMenuIds, menuForPath, SUPERADMIN_MENUS } from '../src/lib/access/menus.ts';

const map = {
  'ฝ่ายประชาสัมพันธ์': ['/admin', '/admin/news'],
  'ฝ่ายวิชาการ': ['/admin/blog/content', '/admin/users'], // /admin/users มอบผ่านฝ่ายไม่ได้
};

test('superadmin เข้าได้ทุกเมนู รวมเมนูสงวน', () => {
  const a = allowedMenus('superadmin', [], {});
  for (const m of SUPERADMIN_MENUS) assert.ok(a.has(m));
  assert.ok(a.has('/admin/news'));
});

test('ผู้ใช้หลายฝ่ายได้สิทธิ์รวมกัน และเมนูสงวนไม่รั่วผ่านฝ่าย', () => {
  const a = allowedMenus('admin', ['ฝ่ายประชาสัมพันธ์', 'ฝ่ายวิชาการ'], map);
  assert.ok(a.has('/admin/news'));
  assert.ok(a.has('/admin/blog/content'));
  assert.ok(!a.has('/admin/users'));
  assert.ok(a.has('/admin/profile'), 'บัญชีของฉันเปิดให้ทุกคน');
});

test('ไม่มีฝ่าย = เข้าได้แค่บัญชีของตัวเอง', () => {
  const a = allowedMenus('user', [], map);
  assert.deepEqual([...a], ['/admin/profile']);
});

test('ฝ่ายที่ถูกลบไปแล้วไม่ให้สิทธิ์อะไร', () => {
  const a = allowedMenus('admin', ['ฝ่ายที่ไม่มีแล้ว'], map);
  assert.equal(a.size, 1);
});

test('หน้าย่อยใช้สิทธิ์ของเมนูแม่ที่ตรงที่สุด', () => {
  assert.equal(menuForPath('/admin/news/edit/123'), '/admin/news');
  assert.equal(menuForPath('/admin/activity/calendar'), '/admin/activity/calendar');
  assert.equal(menuForPath('/admin/activity/create'), '/admin/activity');
  assert.equal(menuForPath('/admin'), '/admin');
  const a = allowedMenus('admin', ['ฝ่ายประชาสัมพันธ์'], map);
  assert.ok(canAccessPath('/admin/news/create', a));
  assert.ok(!canAccessPath('/admin/activity', a));
  assert.ok(!canAccessPath('/admin/permissions', a));
});

test('cleanMenuIds ตัดค่าซ้ำและเมนูที่มอบไม่ได้', () => {
  assert.deepEqual(cleanMenuIds(['/admin/news', '/admin/news', '/admin/users', '/x']), ['/admin/news']);
});
