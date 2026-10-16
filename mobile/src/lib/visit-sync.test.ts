import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeVisits, rowToVisit, visitToRow } from './visit-sync.ts';
import type { Visit } from './visits.ts';

const visit = (id: string, visitedAt: string): Visit => ({
  id,
  title: `Place ${id}`,
  coordinates: { latitude: 1.29, longitude: 103.85 },
  visitedAt,
});

test('a visit survives the trip to the database and back', () => {
  const original: Visit = {
    ...visit('Q1', '2026-05-01T10:00:00.000Z'),
    thumbnailUrl: 'https://example.org/a.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/A',
  };
  const row = visitToRow(original, 'user-1');
  assert.equal(row.user_id, 'user-1');
  assert.equal(row.place_id, 'Q1');
  assert.deepEqual(rowToVisit(row), original);
});

test('the database time format is read back as the same moment', () => {
  const row = visitToRow(visit('Q1', '2026-05-01T10:00:00.000Z'), 'user-1');
  assert.equal(rowToVisit({ ...row, visited_at: '2026-05-01T10:00:00+00:00' }).visitedAt, '2026-05-01T10:00:00.000Z');
});

test('places from your account are added to the phone', () => {
  const local = [visit('A', '2026-05-02T00:00:00.000Z')];
  const merged = mergeVisits(local, [visit('B', '2026-04-01T00:00:00.000Z')]);
  assert.deepEqual(merged.map((v) => v.id).sort(), ['A', 'B']);
});

test('the earliest visit to a place wins', () => {
  const local = [visit('A', '2026-05-02T00:00:00.000Z')];
  const merged = mergeVisits(local, [visit('A', '2026-01-01T00:00:00.000Z')]);
  assert.equal(merged[0].visitedAt, '2026-01-01T00:00:00.000Z');
});

test('nothing new from the account returns the same list', () => {
  const local = [visit('A', '2026-01-01T00:00:00.000Z')];
  assert.equal(mergeVisits(local, [visit('A', '2026-05-02T00:00:00.000Z')]), local);
  assert.equal(mergeVisits(local, []), local);
});
