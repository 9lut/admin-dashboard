import test from 'node:test';
import assert from 'node:assert/strict';
import { activityNotifications, newsReviewNotifications, userNotifications } from '../src/lib/notifications.ts';
import { matchesLog, resourceKey } from '../src/lib/logs/filter.ts';
import { blogImages, coordsFromMapsUrl, imagesField, keyFromUrl } from '../src/lib/inputs/images.ts';

const NOW = new Date('2026-10-20T10:00:00+07:00').getTime();
const at = (days, hour = 9) => new Date(NOW + days * 864e5 + (hour - 10) * 36e5).toISOString();

/* ---------- การแจ้งเตือน ---------- */
test('แจ้งเตือนกิจกรรม: วันนี้ / ใน 7 วัน / ไม่แจ้งที่ไกลหรือผ่านไปแล้ว', () => {
  const list = [
    { _id: 'today', name_th: 'วันนี้', start_date: at(0, 8), end_date: at(0, 18) },
    { _id: 'multi', name_th: 'หลายวัน', start_date: at(-1), end_date: at(1) },
    { _id: 'tmr', name_th: 'พรุ่งนี้', start_date: at(1) },
    { _id: 'd7', name_th: 'อีก7', start_date: at(7) },
    { _id: 'd8', name_th: 'อีก8', start_date: at(8) },
    { _id: 'past', name_th: 'จบแล้ว', start_date: at(-3), end_date: at(-2) },
    { _id: 'nodate', name_th: 'ไม่มีวัน', start_date: null },
  ];
  const out = activityNotifications(list, NOW);
  assert.deepEqual(out.map((n) => n.id.split(':')[1]), ['multi', 'today', 'tmr', 'd7']);
  assert.equal(out[0].kind, 'activity-today');
  assert.match(out.find((n) => n.id.endsWith('tmr')).title, /พรุ่งนี้/);
  assert.match(out.find((n) => n.id.endsWith('d7')).title, /อีก 7 วัน/);
});

test('แจ้งเตือนข่าวรอตรวจลิงก์ไปหน้าแก้ไข', () => {
  const [n] = newsReviewNotifications([{ _id: 'n1', name: 'ข่าว', createdAt: at(0) }]);
  assert.equal(n.href, '/admin/news/edit/n1');
  assert.equal(n.kind, 'news-review');
});

test('แจ้งเตือนผู้ใช้: นับเฉพาะคนที่ไม่ใช่ superadmin ที่ไม่มีฝ่าย', () => {
  const out = userNotifications(
    [
      { _id: '1', role: 'superadmin', departments: [] },
      { _id: '2', role: 'admin', departments: [] },
      { _id: '3', role: 'user', departments: ['ก'] },
      { _id: '4', role: 'user', mustChangePassword: true, firstName: 'ก', lastName: 'ข' },
    ],
    NOW,
  );
  assert.match(out[0].title, /2 คน/); // 2 และ 4
  assert.match(out[1].title, /1 คน/);
  assert.equal(userNotifications([{ _id: '1', role: 'admin', departments: ['ก'] }], NOW).length, 0);
});

/* ---------- ตัวกรองบันทึกระบบ ---------- */
test('resourceKey ดึงส่วนของระบบจาก path', () => {
  assert.equal(resourceKey('/api/news/123'), 'news');
  assert.equal(resourceKey('/api/prayer-rooms?x=1'), 'prayer-rooms');
  assert.equal(resourceKey(''), '');
});

test('matchesLog กรองตาม action / user / resource / คำค้น (รวมชื่อผู้ใช้)', () => {
  const d = { action: 'DELETE', resource: '/api/news/1', userId: 'u1', ip: '1.2.3.4', details: { email: 'a@b.c' } };
  assert.ok(matchesLog(d, {}));
  assert.ok(matchesLog(d, { action: 'DELETE', resource: 'news', userId: 'u1' }));
  assert.ok(!matchesLog(d, { action: 'POST' }));
  assert.ok(!matchesLog(d, { resource: 'blog' }));
  assert.ok(matchesLog(d, { q: '1.2.3' }));
  assert.ok(matchesLog(d, { q: 'A@B' }));
  assert.ok(!matchesLog(d, { q: 'สมชาย' }));
  assert.ok(matchesLog(d, { q: 'สมชาย', userIdsMatchingQ: new Set(['u1']) }));
});

/* ---------- รูปสำหรับลบหลายรายการ ---------- */
test('imagesField / blogImages เก็บรูปครบและกรองค่าที่ไม่ใช่ URL', () => {
  assert.deepEqual(imagesField({ images: ['a', '', 3, 'b'] }), ['a', 'b']);
  assert.deepEqual(imagesField({ images: 'a' }), []);
  assert.deepEqual(blogImages({ coverImage: 'c', content: [{ type: 'image', data: { url: 'i1' } }, { type: 'paragraph', data: {} }] }), ['c', 'i1']);
});

test('keyFromUrl ใช้ชื่อไฟล์ท้าย path และตัด query', () => {
  assert.equal(keyFromUrl('https://pub.r2.dev/abc.webp?v=2'), 'abc.webp');
  assert.equal(keyFromUrl(''), null);
});

test('coordsFromMapsUrl รองรับรูปแบบลิงก์ Google Maps หลัก ๆ', () => {
  assert.deepEqual(coordsFromMapsUrl('https://www.google.com/maps/place/x/@7.0086,100.4986,17z'), ['7.0086', '100.4986']);
  assert.deepEqual(coordsFromMapsUrl('https://www.google.com/maps/place/x/data=!3d7.01!4d100.5'), ['7.01', '100.5']);
  assert.deepEqual(coordsFromMapsUrl('https://maps.google.com/?q=7.1,100.2'), ['7.1', '100.2']);
  assert.equal(coordsFromMapsUrl('https://maps.app.goo.gl/abc'), null);
});
