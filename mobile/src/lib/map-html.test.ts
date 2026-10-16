import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMapHtml } from './map-html.ts';

test('the map page loads a pinned, integrity-checked copy of Leaflet', () => {
  const html = buildMapHtml({ dark: false });
  assert.match(html, /leaflet@1\.9\.4\/dist\/leaflet\.js" integrity="sha256-/);
  assert.match(html, /leaflet@1\.9\.4\/dist\/leaflet\.css" integrity="sha256-/);
});

test('dark mode tells the map page to darken the street map', () => {
  assert.match(buildMapHtml({ dark: true }), /"dark":true/);
  assert.match(buildMapHtml({ dark: false }), /"dark":false/);
});
