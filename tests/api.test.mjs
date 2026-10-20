/**
 * ทดสอบ API จริงผ่าน HTTP (ต้องรัน dev server อยู่) — ตรวจว่า endpoint ที่แตะข้อมูลผู้ใช้
 * ปฏิเสธคำขอที่ไม่ได้ล็อกอินหรือข้อมูลผิดรูปแบบ โดยไม่เขียนข้อมูลจริงใด ๆ
 * กำหนดที่อยู่ด้วย API_BASE (ค่าเริ่มต้น http://localhost:3009) · ถ้าเซิร์ฟเวอร์ไม่ตอบ จะข้ามทั้งชุด
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE ?? 'http://localhost:3009';
const up = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(15000) }).then(() => true).catch(() => false);
const opts = { skip: up ? false : `ไม่มีเซิร์ฟเวอร์ที่ ${BASE}` };

const call = (method, path, body, headers = {}) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: BASE, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });

const protectedCases = [
  ['GET', '/api/accounts'],
  ['GET', '/api/accounts?all=1'],
  ['POST', '/api/accounts', { email: 'x@y.z', password: '12345678', firstName: 'a', lastName: 'b' }],
  ['PUT', '/api/accounts/some-id', { role: 'superadmin' }],
  ['DELETE', '/api/accounts/some-id'],
  ['PATCH', '/api/accounts/some-id/role', { role: 'superadmin' }],
  ['GET', '/api/settings/permissions'],
  ['PUT', '/api/settings/permissions', { departments: { hack: ['/admin/users'] } }],
  ['POST', '/api/settings/departments', { action: 'delete', name: 'ฝ่าย' }],
  ['POST', '/api/settings/departments', { action: 'rename', from: 'a', to: 'b' }],
  ['GET', '/api/system-logs'],
  ['GET', '/api/notifications'],
  ['POST', '/api/news/batch-delete', { ids: ['x'] }],
  ['POST', '/api/activities/batch-delete', { ids: ['x'] }],
  ['POST', '/api/prayer-rooms/batch-delete', { ids: ['x'] }],
  ['POST', '/api/blog/batch-delete', { ids: ['x'] }],
  ['GET', '/api/trash'],
  ['POST', '/api/trash', { action: 'purge', ids: ['x'] }],
  ['GET', '/api/media'],
  ['DELETE', '/api/media', { keys: ['00000000-0000-0000-0000-000000000000.webp'] }],
  ['POST', '/api/media/import', { url: 'https://example.com/a.jpg' }],
  ['GET', '/api/content/revisions?type=news&id=x'],
  ['POST', '/api/content/revisions', { revisionId: 'x' }],
  ['GET', '/api/stats/content?days=30'],
  ['GET', '/api/news?admin=1'],
  ['GET', '/api/storage'],
  ['POST', '/api/accounts/bulk', { action: 'set-role', ids: ['x'], value: 'superadmin' }],
  ['POST', '/api/accounts/some-id/reset-password'],
  ['PUT', '/api/storage', { logsDays: 7 }],
  ['POST', '/api/storage'],
  ['GET', '/api/activities?admin=1'],
];

for (const [method, path, body] of protectedCases) {
  test(`${method} ${path} ปฏิเสธเมื่อไม่ได้ล็อกอิน`, opts, async () => {
    const res = await call(method, path, body);
    assert.ok([401, 403].includes(res.status), `ได้ ${res.status}`);
    const json = await res.json();
    assert.equal(json.status, 'fail');
  });
}

test('คำขอแก้ไขที่แนบ session แต่ไม่มี Origin ถูกกัน CSRF (403)', opts, async () => {
  const res = await fetch(`${BASE}/api/settings/permissions`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: 'session=fake' },
    body: JSON.stringify({ departments: {} }),
  });
  assert.equal(res.status, 403);
});

test('คำขอแก้ไขจาก Origin แปลกปลอมถูกกัน CSRF (403)', opts, async () => {
  const res = await call('POST', '/api/settings/departments', { action: 'delete', name: 'x' }, { cookie: 'session=fake', origin: 'https://evil.example' });
  assert.equal(res.status, 403);
});

test('API สาธารณะยังเปิดอ่านได้ (หน้าเว็บหลักใช้)', opts, async () => {
  for (const path of ['/api/news', '/api/activities', '/api/prayer-rooms']) {
    const res = await fetch(`${BASE}${path}`);
    assert.equal(res.status, 200, path);
  }
});
