/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleTitleFromUrl, parseArticleText, translateArticle, type Article } from './article.ts';
import { factsFromClaims, formatWikidataTime, referencedItems, type WikidataClaims } from './facts.ts';

const text = `Fort Canning Hill is a hill in Singapore.
It was the seat of the kings of Temasek.


== History ==
The hill was known as Bukit Larangan.

=== 14th century ===
A palace stood here.


== Architecture ==


=== Gates ===
The Gothic gate dates from 1846.


== See also ==
Other hills


== References ==

=== Citations ===
Smith 2001`;

test('splits an article into its intro and sections', () => {
  assert.deepEqual(parseArticleText(text), [
    { level: 0, paragraphs: ['Fort Canning Hill is a hill in Singapore.', 'It was the seat of the kings of Temasek.'] },
    { heading: 'History', level: 1, paragraphs: ['The hill was known as Bukit Larangan.'] },
    { heading: '14th century', level: 2, paragraphs: ['A palace stood here.'] },
    // Kept because its subsection has text.
    { heading: 'Architecture', level: 1, paragraphs: [] },
    { heading: 'Gates', level: 2, paragraphs: ['The Gothic gate dates from 1846.'] },
  ]);
});

test('reads the article title out of a Wikipedia link', () => {
  assert.equal(articleTitleFromUrl('https://en.wikipedia.org/wiki/Fort_Canning_Park'), 'Fort Canning Park');
  assert.equal(articleTitleFromUrl('https://es.wikipedia.org/wiki/Palacio_Real_de_Madrid'), 'Palacio Real de Madrid');
  assert.equal(articleTitleFromUrl('https://fr.wikipedia.org/wiki/Ch%C3%A2teau_de_Versailles'), 'Château de Versailles');
  assert.equal(articleTitleFromUrl('https://example.com/'), undefined);
});

test('translates what it can and keeps the rest', async () => {
  const article: Article = {
    language: 'es',
    title: 'Palacio Real',
    url: 'https://es.wikipedia.org/wiki/Palacio_Real',
    sections: [{ heading: 'Historia', level: 1, paragraphs: ['Uno.', 'Dos.'] }],
  };
  const translated = await translateArticle(article, 'en', async (value) =>
    value === 'Historia' ? 'History' : value === 'Uno.' ? 'One.' : undefined,
  );
  assert.deepEqual(translated?.sections, [{ heading: 'History', level: 1, paragraphs: ['One.', 'Dos.'] }]);
  assert.equal(translated?.translatedFrom, 'es');
  assert.equal(await translateArticle(article, 'en', async () => undefined), undefined);
  assert.equal(await translateArticle(article, 'es', async () => 'x'), undefined);
});

test('writes Wikidata dates only as exactly as they are known', () => {
  assert.equal(formatWikidataTime({ time: '+1776-07-04T00:00:00Z', precision: 11 }), '4 July 1776');
  assert.equal(formatWikidataTime({ time: '+1776-07-00T00:00:00Z', precision: 10 }), 'July 1776');
  assert.equal(formatWikidataTime({ time: '+1889-00-00T00:00:00Z', precision: 9 }), '1889');
  assert.equal(formatWikidataTime({ time: '+1774-00-00T00:00:00Z', precision: 8 }), '1770s');
  assert.equal(formatWikidataTime({ time: '+1201-00-00T00:00:00Z', precision: 7 }), '13th century');
  assert.equal(formatWikidataTime({ time: '+1900-00-00T00:00:00Z', precision: 7 }), '19th century');
  assert.equal(formatWikidataTime({ time: '-0447-00-00T00:00:00Z', precision: 9 }), '447 BC');
  assert.equal(formatWikidataTime({ time: '-2600-00-00T00:00:00Z', precision: 7 }), '26th century BC');
});

const item = (id: string, qualifiers?: Record<string, unknown[]>) => ({
  rank: 'normal' as const,
  mainsnak: { snaktype: 'value', datavalue: { value: { id } } },
  qualifiers: qualifiers as never,
});
const time = (value: string, precision: number) => ({
  snaktype: 'value',
  datavalue: { value: { time: value, precision } },
});

test('turns Wikidata statements into key facts', () => {
  const claims: WikidataClaims = {
    P31: [item('Q23413')],
    P571: [{ rank: 'normal', mainsnak: time('+1887-01-28T00:00:00Z', 11) }],
    P84: [item('Q20882'), { ...item('Q999'), rank: 'deprecated' }],
    P1435: [item('Q1', { P580: [time('+1964-00-00T00:00:00Z', 9)] })],
    P793: [item('Q2', { P585: [time('+1944-00-00T00:00:00Z', 9)] }), item('Q404')],
    P2048: [{ rank: 'normal', mainsnak: { snaktype: 'value', datavalue: { value: { amount: '+330', unit: 'http://www.wikidata.org/entity/Q11573' } } } }],
    P757: [{ rank: 'normal', mainsnak: { snaktype: 'value', datavalue: { value: '600' } } }],
  };
  assert.deepEqual(referencedItems(claims), ['Q23413', 'Q20882', 'Q1', 'Q2', 'Q404']);
  const labels = new Map([
    ['Q23413', 'castle'],
    ['Q20882', 'Gustave Eiffel'],
    ['Q1', 'monument historique'],
    ['Q2', 'liberation of Paris'],
  ]);
  assert.deepEqual(factsFromClaims(claims, labels), [
    { label: 'What it is', values: ['Castle'], url: undefined },
    { label: 'Built or founded', values: ['28 January 1887'], url: undefined },
    { label: 'Architect', values: ['Gustave Eiffel'], url: undefined },
    { label: 'Height', values: ['330 m'], url: undefined },
    { label: 'Heritage status', values: ['Monument historique (since 1964)'], url: undefined },
    { label: 'UNESCO World Heritage Site', values: ['Yes'], url: 'https://whc.unesco.org/en/list/600' },
    // Q404 has no name, so it is left out rather than shown as a code.
    { label: 'Key events', values: ['Liberation of Paris (1944)'], url: undefined },
  ]);
});
