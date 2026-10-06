/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceInMetres, formatDistance } from './geo.ts';
import { mergeArticles, type WikipediaArticle } from './places.ts';

// Puerta del Sol, Madrid
const madrid = { latitude: 40.4168, longitude: -3.7038 };

function article(overrides: Partial<WikipediaArticle>): WikipediaArticle {
  return {
    language: 'en',
    pageId: 1,
    title: 'Example',
    url: 'https://en.wikipedia.org/wiki/Example',
    coordinates: madrid,
    ...overrides,
  };
}

test('distance between Madrid and Seville is about 390 km', () => {
  const seville = { latitude: 37.3891, longitude: -5.9845 };
  const km = distanceInMetres(madrid, seville) / 1000;
  assert.ok(km > 385 && km < 395, `got ${km} km`);
});

test('formats short and long distances', () => {
  assert.equal(formatDistance(234), '230 m');
  assert.equal(formatDistance(1234), '1.2 km');
});

test('articles about the same place in two languages become one place with two sources', () => {
  const places = mergeArticles(
    [
      article({ language: 'es', pageId: 7, title: 'Palacio Real de Madrid', wikidataId: 'Q849', summary: 'Resumen' }),
      article({ language: 'en', pageId: 9, title: 'Royal Palace of Madrid', wikidataId: 'Q849' }),
    ],
    madrid,
  );
  assert.equal(places.length, 1);
  assert.equal(places[0].title, 'Royal Palace of Madrid');
  assert.equal(places[0].summary, 'Resumen', 'falls back to the Spanish summary when English has none');
  assert.deepEqual(
    places[0].sources.map((source) => source.language),
    ['en', 'es'],
  );
});

test('articles without a Wikidata ID are kept separately', () => {
  const places = mergeArticles(
    [article({ pageId: 1, title: 'A' }), article({ language: 'es', pageId: 1, title: 'B' })],
    madrid,
  );
  assert.equal(places.length, 2);
});

test('places are sorted nearest first', () => {
  const places = mergeArticles(
    [
      article({ pageId: 1, title: 'Far', coordinates: { latitude: 40.43, longitude: -3.7038 } }),
      article({ pageId: 2, title: 'Near', coordinates: { latitude: 40.417, longitude: -3.7038 } }),
    ],
    madrid,
  );
  assert.deepEqual(
    places.map((place) => place.title),
    ['Near', 'Far'],
  );
});
