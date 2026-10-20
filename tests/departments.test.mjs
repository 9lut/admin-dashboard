import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDepartmentMap, DepartmentError, normalizeDepartmentName, removeFromMap, renameInList, renameInMap } from '../src/lib/access/departments.ts';

test('ชื่อฝ่าย: ตัดช่องว่างซ้ำ', () => {
  assert.equal(normalizeDepartmentName('  ฝ่าย   ประชาสัมพันธ์ '), 'ฝ่าย ประชาสัมพันธ์');
});

test('ชื่อฝ่าย: ว่าง/ยาวเกิน/มีอักขระต้องห้าม ไม่ผ่าน', () => {
  assert.throws(() => normalizeDepartmentName('  '), DepartmentError);
  assert.throws(() => normalizeDepartmentName('ก'.repeat(51)), DepartmentError);
  for (const bad of ['ฝ่าย.ไอที', 'a/b', 'x*', '[x]', '~x']) assert.throws(() => normalizeDepartmentName(bad), DepartmentError, bad);
});

test('บันทึกสิทธิ์: ตัดเมนูที่มอบไม่ได้ และกันชื่อซ้ำหลังจัดรูป', () => {
  const out = cleanDepartmentMap({ 'ฝ่าย ก': ['/admin/news', '/admin/users', '/admin/news'] });
  assert.deepEqual(out, { 'ฝ่าย ก': ['/admin/news'] });
  assert.throws(() => cleanDepartmentMap({ 'ฝ่าย ก': [], ' ฝ่าย  ก ': [] }), /ซ้ำ/);
});

test('เปลี่ยนชื่อฝ่าย: รักษาลำดับและสิทธิ์เดิม', () => {
  const map = { A: ['/admin'], B: ['/admin/news'], C: [] };
  assert.deepEqual(Object.entries(renameInMap(map, 'B', 'บี')), [['A', ['/admin']], ['บี', ['/admin/news']], ['C', []]]);
});

test('เปลี่ยนชื่อฝ่าย: ไม่พบฝ่ายเดิม หรือชื่อใหม่ชนฝ่ายอื่น', () => {
  assert.throws(() => renameInMap({ A: [] }, 'X', 'Y'), /ไม่พบ/);
  assert.throws(() => renameInMap({ A: [], B: [] }, 'A', 'B'), /มีฝ่ายชื่อนี้อยู่แล้ว/);
});

test('ลบฝ่าย', () => {
  assert.deepEqual(removeFromMap({ A: [], B: [] }, 'A'), { B: [] });
  assert.throws(() => removeFromMap({ A: [] }, 'Z'), /ไม่พบ/);
});

test('ย้ายผู้ใช้ไปชื่อฝ่ายใหม่ไม่ทำให้ฝ่ายซ้ำ', () => {
  assert.deepEqual(renameInList(['A', 'B'], 'A', 'B'), ['B']);
  assert.deepEqual(renameInList(['A', 'C'], 'A', 'X'), ['X', 'C']);
});
