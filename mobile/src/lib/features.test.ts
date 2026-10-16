/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePhotoYear, pickThenAndNow, stripHtml, type CommonsPhoto } from './commons.ts';
import { distanceInMetres } from './geo.ts';
import { combinePlaces, downloadGrid, savedPlacesNear, type SavedArea } from './offline.ts';
import type { Place } from './places.ts';
import { addVisits, placesYouAreAt, sortVisits } from './visits.ts';

// Puerta del Sol, Madrid
const madrid = { latitude: 40.4168, longitude: -3.7038 };

function place(overrides: Partial<Place>): Place {
  return {
    id: 'Q1',
    title: 'Example',
    titleLanguage: 'en',
    coordinates: madrid,
    distanceMetres: 0,
    sources: [{ language: 'en', url: 'https://en.wikipedia.org/wiki/Example' }],
    ...overrides,
  };
}

function photo(year: number | undefined, title = `Photo ${year}`): CommonsPhoto {
  return { title, imageUrl: `https://example.org/${title}.jpg`, pageUrl: 'https://commons.wikimedia.org/', year };
}

test('reads the year a photo was taken from Commons date text', () => {
  assert.equal(parsePhotoYear('1890'), 1890);
  assert.equal(parsePhotoYear('circa 1925'), 1925);
  assert.equal(parsePhotoYear('2019-06-01 12:00:00'), 2019);
  assert.equal(parsePhotoYear('<time class="dtstart" datetime="1904">1904</time>'), 1904);
  assert.equal(parsePhotoYear('unknown date'), undefined);
  assert.equal(parsePhotoYear(undefined), undefined);
  // Not a year: a long number from a camera serial or file name.
  assert.equal(parsePhotoYear('IMG 123456'), undefined);
});

test('turns Commons author HTML into plain text', () => {
  assert.equal(stripHtml('<a href="//commons.wikimedia.org/wiki/User:X">J. Laurent &amp; Cía</a>'), 'J. Laurent & Cía');
});

test('picks old photos oldest first and the newest recent photo', () => {
  const result = pickThenAndNow([photo(1950), photo(2012), photo(undefined), photo(1880), photo(1985), photo(2021)]);
  assert.deepEqual(
    result.then.map((p) => p.year),
    [1880, 1950],
  );
  assert.equal(result.now?.year, 2021);
});

test('has no comparison when there are no old photos', () => {
  const result = pickThenAndNow([photo(2015), photo(undefined)]);
  assert.equal(result.then.length, 0);
  assert.equal(result.now?.year, 2015);
});

test('logs places you are standing at, once each, keeping the first visit', () => {
  const nearby = [place({ id: 'Q1', distanceMetres: 40 }), place({ id: 'Q2', distanceMetres: 600 })];
  const atNow = placesYouAreAt(nearby);
  assert.deepEqual(
    atNow.map((p) => p.id),
    ['Q1'],
  );

  const first = addVisits([], atNow, new Date('2026-10-01T10:00:00Z'));
  assert.equal(first.length, 1);
  assert.equal(first[0].sourceUrl, 'https://en.wikipedia.org/wiki/Example');

  const again = addVisits(first, atNow, new Date('2026-10-02T10:00:00Z'));
  assert.equal(again, first, 'nothing new, so the same list comes back');

  const more = addVisits(first, [place({ id: 'Q3' })], new Date('2026-10-03T10:00:00Z'));
  assert.deepEqual(
    sortVisits(more).map((v) => v.id),
    ['Q3', 'Q1'],
  );
});

test('covers a city with overlapping searches, middle first', () => {
  const grid = downloadGrid(madrid, 14000);
  assert.equal(grid.length, 25);
  assert.deepEqual(grid[0], madrid);
  // The farthest corner is 2 steps of 3.5 km in each direction.
  const farthest = Math.max(...grid.map((point) => distanceInMetres(madrid, point)));
  assert.ok(Math.abs(farthest - Math.hypot(7000, 7000)) < 50, `farthest corner was ${farthest} m`);
  assert.equal(downloadGrid(madrid, 0).length, 1);
});

test('combines search results and finds saved places near you', () => {
  const near = { latitude: 40.4172, longitude: -3.7038 }; // ~45 m north
  const far = { latitude: 40.45, longitude: -3.7038 }; // ~3.7 km north
  const combined = combinePlaces(
    [
      [place({ id: 'Q1', coordinates: near }), place({ id: 'Q2', coordinates: far })],
      [place({ id: 'Q1', coordinates: near, title: 'Duplicate' })],
    ],
    madrid,
  );
  assert.deepEqual(
    combined.map((p) => p.id),
    ['Q1', 'Q2'],
  );
  assert.equal(combined[0].title, 'Example');

  const area: SavedArea = {
    id: 'madrid',
    name: 'Madrid',
    center: madrid,
    language: 'en',
    savedAt: '2026-10-01T10:00:00Z',
    places: combined,
  };
  const found = savedPlacesNear([area], madrid, 2000);
  assert.deepEqual(
    found.map((p) => p.id),
    ['Q1'],
  );
  assert.ok(found[0].distanceMetres < 60);
});
