import test from 'node:test';
import assert from 'node:assert/strict';
import { cutoffs, DEFAULT_POLICY, estimateDocBytes, LIMITS, normalizePolicy, usageLevel } from '../src/lib/storage/policy.ts';

test('นโยบาย: ไม่มีค่า = ใช้ค่าเริ่มต้น (แพ็กเกจฟรี)', () => {
  assert.deepEqual(normalizePolicy(null), DEFAULT_POLICY);
  assert.equal(DEFAULT_POLICY.firestoreWritesPerDay, 20000);
});

test('นโยบาย: ค่าถูกบีบให้อยู่ในขอบเขตปลอดภัย (กันตั้ง 0 วันจนข้อมูลหายหมด)', () => {
  const p = normalizePolicy({ logsDays: 0, trashDays: 999, revisionsMax: -5, viewStatsDays: 'x', viewStatsEnabled: false, r2QuotaGB: 2.6 });
  assert.equal(p.logsDays, LIMITS.logsDays[0]);
  assert.equal(p.trashDays, LIMITS.trashDays[1]);
  assert.equal(p.revisionsMax, 1);
  assert.equal(p.viewStatsDays, DEFAULT_POLICY.viewStatsDays);
  assert.equal(p.viewStatsEnabled, false);
  assert.equal(p.r2QuotaGB, 3);
});

test('จุดตัดการล้างข้อมูลคำนวณจากวันที่เก็บ (วันตามเวลาไทย)', () => {
  const now = Date.parse('2026-10-20T20:00:00Z'); // = 21 ต.ค. 03:00 เวลาไทย
  const c = cutoffs({ ...DEFAULT_POLICY, logsDays: 90, viewStatsDays: 30 }, now);
  assert.equal(c.logsBefore.toISOString(), new Date(now - 90 * 864e5).toISOString());
  assert.equal(c.viewStatsBeforeDay, '2026-09-21');
});

test('ระดับเตือน: 70% ใกล้เต็ม · 90% เกือบเต็ม', () => {
  assert.equal(usageLevel(6, 10), 'ok');
  assert.equal(usageLevel(7, 10), 'warn');
  assert.equal(usageLevel(9.5, 10), 'danger');
  assert.equal(usageLevel(5, 0), 'ok');
});

test('ขนาดเอกสารโดยประมาณเพิ่มตามข้อความภาษาไทย (UTF-8) และฟิลด์ซ้อน', () => {
  const small = estimateDocBytes({ a: 'x' });
  const thai = estimateDocBytes({ a: 'ก'.repeat(100) });
  assert.ok(thai > small + 250, 'อักษรไทย 3 ไบต์ต่อตัว');
  assert.ok(estimateDocBytes({ list: [{ b: 1 }, { b: 2 }] }) > estimateDocBytes({}));
});
