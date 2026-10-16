import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysInMonth, parsePlaceSearch, stepDate, toLocalNoon, visitFromSearchResult } from './place-search.ts';

const today = { year: 2026, month: 10, day: 16 };

test('search results come back best match first, using the same IDs as nearby places', () => {
  const results = parsePlaceSearch(
    {
      query: {
        pages: [
          {
            pageid: 2,
            title: 'Old Town',
            index: 2,
            fullurl: 'https://en.wikipedia.org/wiki/Old_Town',
            coordinates: [{ lat: 1, lon: 2 }],
          },
          {
            pageid: 1,
            title: 'Kyoto',
            index: 1,
            fullurl: 'https://en.wikipedia.org/wiki/Kyoto',
            description: 'City in Japan',
            coordinates: [{ lat: 35.01, lon: 135.77 }],
            pageprops: { wikibase_item: 'Q34600' },
          },
        ],
      },
    },
    'en',
  );
  assert.deepEqual(
    results.map((r) => r.id),
    ['Q34600', 'en:2'],
  );
  assert.equal(results[0].description, 'City in Japan');
  assert.deepEqual(results[0].coordinates, { latitude: 35.01, longitude: 135.77 });
});

test('articles without a location are left out', () => {
  const results = parsePlaceSearch(
    { query: { pages: [{ pageid: 1, title: 'Tea', index: 1, fullurl: 'https://en.wikipedia.org/wiki/Tea' }] } },
    'en',
  );
  assert.deepEqual(results, []);
  assert.deepEqual(parsePlaceSearch({}, 'en'), []);
});

test('a picked place becomes a visit on the chosen day', () => {
  const visit = visitFromSearchResult(
    { id: 'Q1', title: 'A', coordinates: { latitude: 1, longitude: 2 }, url: 'https://en.wikipedia.org/wiki/A' },
    toLocalNoon({ year: 2019, month: 3, day: 5 }),
  );
  assert.equal(visit.sourceUrl, 'https://en.wikipedia.org/wiki/A');
  const when = new Date(visit.visitedAt);
  assert.deepEqual([when.getFullYear(), when.getMonth() + 1, when.getDate()], [2019, 3, 5]);
});

test('months have the right number of days', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2025, 2), 28);
  assert.equal(daysInMonth(2025, 12), 31);
});

test('stepping the day and month wraps around', () => {
  assert.deepEqual(stepDate({ year: 2020, month: 1, day: 1 }, 'day', -1, today), { year: 2020, month: 1, day: 31 });
  assert.deepEqual(stepDate({ year: 2020, month: 12, day: 5 }, 'month', 1, today), { year: 2020, month: 1, day: 5 });
});

test('a day that the new month lacks becomes its last day', () => {
  assert.deepEqual(stepDate({ year: 2023, month: 1, day: 31 }, 'month', 1, today), { year: 2023, month: 2, day: 28 });
});

test('you cannot pick a date in the future', () => {
  assert.deepEqual(stepDate(today, 'year', 1, today), today);
  assert.deepEqual(stepDate({ year: 2026, month: 9, day: 20 }, 'month', 1, today), today);
  assert.deepEqual(stepDate({ year: 2025, month: 10, day: 16 }, 'year', -1, today), { year: 2024, month: 10, day: 16 });
});
