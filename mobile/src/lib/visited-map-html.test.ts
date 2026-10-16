import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildVisitedMapHtml, GEO_SCRIPT } from './visited-map-html.ts';

type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
type Feature = { id: string; geometry: Geometry };
type Geo = {
  bounds: (geometry: Geometry) => number[];
  unwrap: (geometry: Geometry) => Geometry;
  countryAt: (lng: number, lat: number, countries: { feature: Feature; bounds: number[] }[]) => Feature | null;
};

// Run the map page's country lookup here, outside the page.
const geo = new Function(`${GEO_SCRIPT}; return { bounds: gohistBounds, countryAt: gohistCountryAt, unwrap: gohistUnwrap };`)() as Geo;

const square = (x: number, y: number, size: number) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
];

// A square "country" with a lake (a hole) in it, and a two-island one.
const lakeland: Feature = {
  id: '1',
  geometry: { type: 'Polygon', coordinates: [square(0, 0, 10), square(4, 4, 2)] },
};
const islands: Feature = {
  id: '2',
  geometry: { type: 'MultiPolygon', coordinates: [[square(20, 0, 2)], [square(30, 0, 2)]] },
};
const countries = [lakeland, islands].map((feature) => ({ feature, bounds: geo.bounds(feature.geometry) }));

test('a point inside a country is found', () => {
  assert.equal(geo.countryAt(1, 1, countries)?.id, '1');
  assert.equal(geo.countryAt(31, 1, countries)?.id, '2');
});

test('a point in a lake or the sea is in no country', () => {
  assert.equal(geo.countryAt(5, 5, countries), null);
  assert.equal(geo.countryAt(25, 1, countries), null);
});

test('a seafront just outside a simplified outline counts for the nearest country', () => {
  assert.equal(geo.countryAt(10.1, 5, countries)?.id, '1');
  assert.equal(geo.countryAt(29.8, 1, countries)?.id, '2');
});

test('the bounds of a country cover all its islands', () => {
  assert.deepEqual(geo.bounds(islands.geometry), [20, 0, 32, 2]);
});

test('an outline crossing the 180th meridian is drawn without jumping across the map', () => {
  const fiji: Geometry = {
    type: 'Polygon',
    coordinates: [[[179, -17], [-179, -17], [-179, -18], [179, -18], [179, -17]]],
  };
  assert.deepEqual(geo.unwrap(fiji).coordinates, [[[179, -17], [181, -17], [181, -18], [179, -18], [179, -17]]]);
});

test('the page loads pinned, integrity-checked map code and country outlines', () => {
  const html = buildVisitedMapHtml({ dark: false });
  assert.match(html, /leaflet@1\.9\.4\/dist\/leaflet\.js" integrity="sha256-/);
  assert.match(html, /topojson-client@3\.1\.0\/dist\/topojson-client\.min\.js" integrity="sha256-/);
  assert.match(html, /"countriesUrl":"https:\/\/cdn\.jsdelivr\.net\/npm\/world-atlas@2\.0\.2\/countries-50m\.json"/);
  assert.match(html, /"countriesHash":"sha256-/);
});

test('dark mode is passed to the page', () => {
  assert.match(buildVisitedMapHtml({ dark: true }), /<body class="dark">/);
});
