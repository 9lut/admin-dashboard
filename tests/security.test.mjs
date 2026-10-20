import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';

test('secure random values stay inside the password charset', () => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const values = Array.from({ length: 100 }, () => charset[randomInt(0, charset.length)]);
  assert.equal(values.length, 100);
  assert.ok(values.every((value) => charset.includes(value)));
});

test('prayer room fallback slug is URL-safe and stable', () => {
  const id = 'a1b2c3d4-room';
  const slug = `prayer-room-${id.slice(0, 8)}`;
  assert.match(slug, /^[a-z0-9-]+$/);
  assert.equal(slug, 'prayer-room-a1b2c3d4');
});

test('prayer room SEO slugs use readable ASCII names', () => {
  const value = 'Faculty of Science Prayer Room';
  const slug = value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  assert.equal(slug, 'faculty-of-science-prayer-room');
});
