/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceInMetres, formatDistance } from './geo.ts';
import { searchLanguages } from './languages.ts';
import { localizePlaces, mergeArticles, otherShownLanguage, type WikipediaArticle } from './places.ts';

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

test('English is searched first by default, and a chosen language comes before English', () => {
  assert.deepEqual(searchLanguages('en'), ['en', 'es']);
  assert.deepEqual(searchLanguages('fr'), ['fr', 'en', 'es']);
});

test('a place with only a Spanish article gets its English name and description from Wikidata', () => {
  const merged = mergeArticles(
    [article({ language: 'es', title: 'Ermita de San Antonio', wikidataId: 'Q5', summary: 'Una ermita.' })],
    madrid,
  );
  const [place] = localizePlaces(
    merged,
    'en',
    new Map([['Q5', { label: 'Hermitage of San Antonio', description: 'church in Madrid, Spain' }]]),
  );
  assert.equal(place.title, 'Hermitage of San Antonio');
  assert.equal(place.summary, 'Church in Madrid, Spain');
  assert.equal(otherShownLanguage(place, 'en'), undefined, 'everything is now in English');
});

test('without Wikidata text, a Spanish-only place keeps its Spanish text and says so', () => {
  const merged = mergeArticles(
    [article({ language: 'es', title: 'Fuente', wikidataId: 'Q6', summary: 'Una fuente.' })],
    madrid,
  );
  const [place] = localizePlaces(merged, 'en', new Map([['Q6', {}]]));
  assert.equal(place.title, 'Fuente');
  assert.equal(place.summary, 'Una fuente.');
  assert.equal(otherShownLanguage(place, 'en'), 'es');
});

test('a Spanish summary borrowed by an English article is flagged, then replaced by Wikidata', () => {
  const merged = mergeArticles(
    [
      article({ language: 'es', title: 'Palacio Real de Madrid', wikidataId: 'Q849', summary: 'Resumen' }),
      article({ language: 'en', title: 'Royal Palace of Madrid', wikidataId: 'Q849' }),
    ],
    madrid,
  );
  assert.equal(otherShownLanguage(merged[0], 'en'), 'es');
  const [place] = localizePlaces(merged, 'en', new Map([['Q849', { description: 'royal residence' }]]));
  assert.equal(place.title, 'Royal Palace of Madrid');
  assert.equal(place.summary, 'Royal residence');
});

test('places already fully in the chosen language are left alone', () => {
  const merged = mergeArticles([article({ title: 'Plaza Mayor', wikidataId: 'Q7', summary: 'A square.' })], madrid);
  const [place] = localizePlaces(merged, 'en', new Map([['Q7', { label: 'Other', description: 'other' }]]));
  assert.equal(place.title, 'Plaza Mayor');
  assert.equal(place.summary, 'A square.');
});

test('a machine translation of the summary is preferred over the short Wikidata description', () => {
  const merged = mergeArticles(
    [article({ language: 'es', title: 'Fuente', wikidataId: 'Q8', summary: 'Una fuente del siglo XVIII.' })],
    madrid,
  );
  const [place] = localizePlaces(
    merged,
    'en',
    new Map([['Q8', { label: 'Fountain', description: 'fountain in Madrid' }]]),
    new Map([['Q8', { title: 'The Fountain', summary: 'An 18th-century fountain.' }]]),
  );
  assert.equal(place.title, 'Fountain', 'the human-written Wikidata name wins over a machine translation');
  assert.equal(place.summary, 'An 18th-century fountain.');
  assert.equal(place.translatedFrom, 'es');
  assert.equal(otherShownLanguage(place, 'en'), undefined);
});

test('the title is machine-translated when Wikidata has no name in the chosen language', () => {
  const merged = mergeArticles([article({ language: 'es', pageId: 3, title: 'Fuente' })], madrid);
  const [place] = localizePlaces(merged, 'en', new Map(), new Map([['es:3', { title: 'Fountain' }]]));
  assert.equal(place.title, 'Fountain');
  assert.equal(place.translatedFrom, 'es');
});

test('places in the chosen language are never marked as translated', () => {
  const merged = mergeArticles([article({ title: 'Plaza Mayor', wikidataId: 'Q7', summary: 'A square.' })], madrid);
  const [place] = localizePlaces(merged, 'en', new Map(), new Map([['Q7', { summary: 'Other' }]]));
  assert.equal(place.summary, 'A square.');
  assert.equal(place.translatedFrom, undefined);
});
