import test from 'node:test';
import assert from 'node:assert/strict';
import { isLive, liveOnly, parsePublishInput, publishState, PublishInputError } from '../src/lib/content/publish.ts';
import { changedFields, CONTENT } from '../src/lib/content/types.ts';
import { aggregate } from '../src/lib/content/stats.ts';
import { findPreviewImage, isPrivateIp } from '../src/lib/storage/urlSafety.ts';
import { allowedMenus } from '../src/lib/access/menus.ts';

const NOW = Date.parse('2026-10-20T10:00:00Z');
const later = new Date(NOW + 3600e3).toISOString();
const earlier = new Date(NOW - 3600e3).toISOString();

/* ---------- ร่าง / ตั้งเวลา ---------- */
test('สถานะเผยแพร่: ข้อมูลเก่าไม่มี status = เผยแพร่แล้ว', () => {
  assert.equal(publishState({}, NOW), 'published');
  assert.equal(publishState({ status: 'draft' }, NOW), 'draft');
  assert.equal(publishState({ status: 'published', publishAt: later }, NOW), 'scheduled');
  assert.equal(publishState({ status: 'published', publishAt: earlier }, NOW), 'published');
  // Firestore Timestamp
  assert.equal(publishState({ publishAt: { toDate: () => new Date(NOW + 1000) } }, NOW), 'scheduled');
});

test('เว็บสาธารณะเห็นเฉพาะรายการที่ถึงเวลาแล้ว (ตั้งเวลาไว้จะขึ้นเองเมื่อถึงเวลา)', () => {
  const rows = [{ id: 1 }, { id: 2, status: 'draft' }, { id: 3, publishAt: later }, { id: 4, publishAt: earlier }];
  assert.deepEqual(liveOnly(rows, NOW).map((r) => r.id), [1, 4]);
  assert.ok(isLive({ publishAt: later }, NOW + 7200e3), 'ผ่านไป 2 ชม. ต้องขึ้นแล้ว');
});

test('แปลงค่าจากฟอร์ม: ตั้งเวลาต้องเป็นอนาคต', () => {
  assert.equal(parsePublishInput(undefined, undefined, NOW), undefined);
  assert.deepEqual(parsePublishInput('draft', later, NOW), { status: 'draft', publishAt: null });
  assert.deepEqual(parsePublishInput('published', later, NOW), { status: 'published', publishAt: null });
  assert.equal(parsePublishInput('scheduled', later, NOW).publishAt.toISOString(), later);
  assert.throws(() => parsePublishInput('scheduled', earlier, NOW), PublishInputError);
  assert.throws(() => parsePublishInput('scheduled', '', NOW), PublishInputError);
  assert.throws(() => parsePublishInput('hacked', '', NOW), PublishInputError);
});

/* ---------- ประวัติการแก้ไข ---------- */
test('changedFields เทียบเฉพาะฟิลด์เนื้อหา ไม่นับยอดวิว/เวลาแก้ไข', () => {
  const ts = (ms) => ({ toDate: () => new Date(ms) });
  const before = { name: 'ก', views: 1, updatedAt: ts(1), date: ts(5), images: ['a'] };
  const after = { name: 'ข', views: 9, updatedAt: ts(2), date: ts(5), images: ['a', 'b'], link: 'x' };
  assert.deepEqual(changedFields(before, after), ['images', 'link', 'name']);
  assert.deepEqual(changedFields(before, { ...before, views: 50 }), []);
});

test('ทะเบียนเนื้อหา: ชื่อ/รูป/ลิงก์แก้ไขของแต่ละประเภท', () => {
  assert.equal(CONTENT.news.title({ name: 'ข่าว' }), 'ข่าว');
  assert.equal(CONTENT.blog.editHref('id1', { slug: 'ramadan' }), '/admin/blog/content/edit/ramadan');
  assert.deepEqual(CONTENT.blog.images({ coverImage: 'c', content: [{ type: 'image', data: { url: 'i' } }] }), ['c', 'i']);
  assert.equal(CONTENT['prayer-rooms'].collection, 'prayerRooms');
});

/* ---------- สถิติ ---------- */
test('aggregate: แยกช่วงปัจจุบัน/ก่อนหน้า รวมตามประเภท และเรียงอันดับ', () => {
  const days = ['d1', 'd2', 'd3', 'd4'];
  const daily = { d1: { 'news:a': 2 }, d2: { 'news:a': 2, 'blog:b': 1 }, d3: { 'news:a': 1, 'blog:b': 5 }, d4: { 'blog:b': 3, 'news:gone': 4 } };
  const items = [
    { type: 'news', id: 'a', title: 'A', totalViews: 10, createdAt: null, href: '', state: 'published' },
    { type: 'blog', id: 'b', title: 'B', totalViews: 9, createdAt: null, href: '', state: 'published' },
  ];
  const r = aggregate(days, daily, items, true);
  assert.deepEqual(r.days, ['d3', 'd4']);
  assert.equal(r.rangeTotal, 13); // 1+5 + 3+4 (รวมเนื้อหาที่ถูกลบแล้ว)
  assert.equal(r.prevTotal, 5);
  assert.equal(r.change, 160);
  assert.deepEqual(r.byType.news, [1, 4]);
  assert.equal(r.items[0].id, 'b');
  assert.deepEqual(r.items[0].series, [5, 3]);
  assert.equal(r.items[1].prevViews, 4);
});

/* ---------- ดึงรูปจากลิงก์ ---------- */
test('isPrivateIp กันลิงก์ไปเครือข่ายภายใน/metadata ของ cloud', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fd00::1', '::ffff:127.0.0.1', '100.64.0.1']) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ['157.240.1.1', '8.8.8.8', '172.32.0.1', '2a03:2880::1']) assert.ok(!isPrivateIp(ip), ip);
});

test('findPreviewImage อ่าน og:image (รองรับลำดับ attribute และ &amp;)', () => {
  const html = '<head><meta content="https://cdn.x/a.jpg?x=1&amp;y=2" property="og:image"><meta name="twitter:image" content="/b.png"></head>';
  assert.equal(findPreviewImage(html, 'https://site.com/p'), 'https://cdn.x/a.jpg?x=1&y=2');
  assert.equal(findPreviewImage('<meta name="twitter:image" content="/b.png">', 'https://site.com/p'), 'https://site.com/b.png');
  assert.equal(findPreviewImage('<p>none</p>', 'https://site.com'), null);
});

/* ---------- เมนูใหม่ ---------- */
test('คลังรูป/ถังขยะ: ได้อัตโนมัติเมื่อมีสิทธิ์เนื้อหาอย่างน้อย 1 เมนู · สถิติต้องมอบผ่านฝ่าย', () => {
  const map = { pr: ['/admin/news'], stat: ['/admin/stats'] };
  const a = allowedMenus('admin', ['pr'], map);
  assert.ok(a.has('/admin/media') && a.has('/admin/trash'));
  assert.ok(!a.has('/admin/stats'));
  const b = allowedMenus('admin', ['stat'], map);
  assert.ok(b.has('/admin/stats') && !b.has('/admin/trash'));
  assert.ok(allowedMenus('superadmin', [], {}).has('/admin/trash'));
});
