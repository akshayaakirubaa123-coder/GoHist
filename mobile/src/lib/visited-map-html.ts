/** What the app tells the visited-places map to show. */
export type VisitedMapState = {
  visits: { id: string; latitude: number; longitude: number }[];
};

/** A country with at least one of your visits in it. */
export type VisitedCountry = { id: string; name: string; places: number };

/** Messages the visited-places map sends back to the app. */
export type VisitedMapEvent =
  | { type: 'ready' }
  | { type: 'countries'; countries: VisitedCountry[] }
  | { type: 'error'; message: string };

// The same pinned Leaflet as the nearby-history map (see map-html.ts).
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_HASH = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const LEAFLET_JS_HASH = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

// Country outlines from Natural Earth (public domain), packaged as "world-atlas".
// The 1:50m version is used because the 1:110m one leaves out small countries
// such as Singapore. topojson-client unpacks the compact file into shapes.
const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
const TOPOJSON_HASH = 'sha256-Jc0CrkhsxQY+AhWk5M+xXeg3AMh6xIusTVfcaq8+u4k=';
const COUNTRIES_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json';
const COUNTRIES_HASH = 'sha256-BDQs3B4wFrzX2xYw3pVoTWe3n+PIxGAyHoeu9GlQI5Q=';

const STREETS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREETS_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** How much ground each visit "uncovers" on the map when you zoom into a city. */
export const COVERAGE_RADIUS_METRES = 400;

/**
 * A complete web page that draws your visited-places map. Zoomed out, it is a
 * plain world outline with every country you've visited filled in. Zoom into
 * a country or city and the street map fades in, with the ground around each
 * place you've visited coloured, so a city fills up as you explore it.
 */
export function buildVisitedMapHtml({ dark }: { dark: boolean }): string {
  const config = JSON.stringify({
    dark,
    countriesUrl: COUNTRIES_URL,
    countriesHash: COUNTRIES_HASH,
    streets: STREETS,
    streetsCredit: STREETS_CREDIT,
    coverageMetres: COVERAGE_RADIUS_METRES,
  });
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" integrity="${LEAFLET_CSS_HASH}" crossorigin="">
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" integrity="${LEAFLET_JS_HASH}" crossorigin=""></script>
<script src="${TOPOJSON_URL}" integrity="${TOPOJSON_HASH}" crossorigin=""></script>
<style>${MAP_CSS}</style>
</head>
<body class="${dark ? 'dark' : ''}">
<div id="map"></div>
<div id="note" hidden></div>
<script>var CONFIG = ${config};</script>
<script>${GEO_SCRIPT}</script>
<script>${MAP_SCRIPT}</script>
</body>
</html>`;
}

const MAP_CSS = `
html, body, #map { height: 100%; margin: 0; }
body { --sea: #f3f1ec; --land: #ffffff; --edge: #b9b4a8; --visited: #c0622f; }
body.dark { --sea: #121212; --land: #1f1f1f; --edge: #4a4a4a; --visited: #e07a43; }
#map { background: var(--sea); }
.streets { opacity: 0; transition: opacity 400ms ease; }
.zoomed-in .streets { opacity: 0.85; }
body.dark .streets { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }
#note {
  position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 1000; padding: 6px 10px;
  border-radius: 8px; font: 13px system-ui, sans-serif; background: rgba(0,0,0,0.7); color: #fff;
}
.leaflet-bar a { font-size: 15px; }
`;

/**
 * Finds which country a point is in. Plain older JavaScript, because it runs
 * inside the map page; it is kept separate from the map code so tests can run it.
 */
export const GEO_SCRIPT = `
function gohistBounds(geometry) {
  var b = [Infinity, Infinity, -Infinity, -Infinity];
  var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach(function (polygon) {
    polygon[0].forEach(function (p) {
      if (p[0] < b[0]) b[0] = p[0];
      if (p[1] < b[1]) b[1] = p[1];
      if (p[0] > b[2]) b[2] = p[0];
      if (p[1] > b[3]) b[3] = p[1];
    });
  });
  return b;
}

function gohistInRing(lng, lat, ring) {
  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function gohistInGeometry(lng, lat, geometry) {
  if (!geometry) return false;
  var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (var p = 0; p < polygons.length; p++) {
    var rings = polygons[p];
    if (!gohistInRing(lng, lat, rings[0])) continue;
    var inHole = false;
    for (var h = 1; h < rings.length; h++) if (gohistInRing(lng, lat, rings[h])) { inHole = true; break; }
    if (!inHole) return true;
  }
  return false;
}

// For drawing: where an outline crosses the 180th meridian (eastern Russia,
// Fiji), keep it going past 180 rather than jumping back to -180, which would
// draw a line across the whole map.
function gohistUnwrap(geometry) {
  function ring(points) {
    var out = [];
    points.forEach(function (p, i) {
      var lng = p[0];
      if (i > 0) {
        var previous = out[i - 1][0];
        while (lng - previous > 180) lng -= 360;
        while (lng - previous < -180) lng += 360;
      }
      out.push([lng, p[1]]);
    });
    return out;
  }
  function polygon(rings) { return rings.map(ring); }
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: polygon(geometry.coordinates) }
    : { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon) };
}

// Distance in degrees (east-west shrunk by latitude) from a point to a country's edge.
function gohistEdgeDistance(lng, lat, geometry) {
  var k = Math.cos((lat * Math.PI) / 180);
  var best = Infinity;
  var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach(function (polygon) {
    var ring = polygon[0];
    for (var i = 1; i < ring.length; i++) {
      var ax = (ring[i - 1][0] - lng) * k, ay = ring[i - 1][1] - lat;
      var bx = (ring[i][0] - lng) * k, by = ring[i][1] - lat;
      var dx = bx - ax, dy = by - ay;
      var len = dx * dx + dy * dy;
      var t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
      var px = ax + t * dx, py = ay + t * dy;
      var d = Math.sqrt(px * px + py * py);
      if (d < best) best = d;
    }
  });
  return best;
}

// The outlines are simplified, so a harbour or seafront can fall just outside
// its country. Such points count for the nearest country within this distance
// (in degrees; 0.3 is about 30 km).
var GOHIST_COAST_DEGREES = 0.3;

/** countries: [{ feature, bounds }]. Returns the matching feature, or null. */
function gohistCountryAt(lng, lat, countries) {
  var nearest = null;
  var nearestDistance = GOHIST_COAST_DEGREES;
  var m = GOHIST_COAST_DEGREES;
  for (var i = 0; i < countries.length; i++) {
    var b = countries[i].bounds;
    if (lng < b[0] - m || lng > b[2] + m || lat < b[1] - m || lat > b[3] + m) continue;
    var geometry = countries[i].feature.geometry;
    var inside = lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];
    if (inside && gohistInGeometry(lng, lat, geometry)) return countries[i].feature;
    var d = gohistEdgeDistance(lng, lat, geometry);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = countries[i].feature;
    }
  }
  return nearest;
}
`;

// Runs inside the map page, like GEO_SCRIPT.
const MAP_SCRIPT = `
(function () {
  var css = getComputedStyle(document.body);
  var colour = function (name) { return css.getPropertyValue(name).trim(); };
  // Below this zoom the map is a plain world outline; above it, streets fade in.
  var CITY_ZOOM = 5;

  var map = L.map('map', {
    zoomControl: false, preferCanvas: true, worldCopyJump: true,
    minZoom: 1, maxZoom: 18, zoomSnap: 0.25, attributionControl: true
  }).fitWorld();
  L.tileLayer(CONFIG.streets, { attribution: CONFIG.streetsCredit, maxZoom: 19, className: 'streets' }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);

  var countries = [];
  var countriesLayer = null;
  var visitedIds = {};
  var coverage = L.layerGroup().addTo(map);
  var state = { visits: [] };
  var fitted = false;

  var World = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      var box = L.DomUtil.create('div', 'leaflet-bar');
      var button = L.DomUtil.create('a', '', box);
      button.href = '#';
      button.title = 'Show the whole world';
      button.setAttribute('role', 'button');
      button.innerHTML = '&#127760;';
      L.DomEvent.on(button, 'click', function (e) {
        L.DomEvent.stop(e);
        map.flyTo([20, 0], 1.5, { duration: 0.8 });
      });
      return box;
    }
  });
  new World().addTo(map);

  function send(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } else if (window.parent !== window) {
      message.source = 'gohist-visited-map';
      window.parent.postMessage(message, '*');
    }
  }

  function note(text) {
    var el = document.getElementById('note');
    el.textContent = text;
    el.hidden = !text;
  }

  function zoomedIn() { return map.getZoom() >= CITY_ZOOM; }

  function countryStyle(feature) {
    var visited = !!visitedIds[feature.id];
    var close = zoomedIn();
    return {
      color: colour('--edge'), weight: close ? 1.5 : 0.6,
      fillColor: visited ? colour('--visited') : colour('--land'),
      // Close up, countries turn see-through so the streets show.
      fillOpacity: close ? (visited ? 0.12 : 0) : (visited ? 0.85 : 1)
    };
  }

  function restyle() {
    map.getContainer().classList.toggle('zoomed-in', zoomedIn());
    if (countriesLayer) countriesLayer.setStyle(countryStyle);
  }
  map.on('zoomend', restyle);

  function draw() {
    coverage.clearLayers();
    var counts = {};
    var names = {};
    state.visits.forEach(function (visit) {
      var at = [visit.latitude, visit.longitude];
      L.circle(at, {
        radius: CONFIG.coverageMetres, stroke: false, fillColor: colour('--visited'), fillOpacity: 0.45,
        interactive: false
      }).addTo(coverage);
      L.circleMarker(at, {
        radius: 3, stroke: false, fillColor: colour('--visited'), fillOpacity: 1, interactive: false
      }).addTo(coverage);
      var country = gohistCountryAt(visit.longitude, visit.latitude, countries);
      if (country) {
        counts[country.id] = (counts[country.id] || 0) + 1;
        names[country.id] = country.properties.name;
      }
    });
    visitedIds = counts;
    restyle();
    if (countries.length) {
      send({
        type: 'countries',
        countries: Object.keys(counts).map(function (id) {
          return { id: id, name: names[id], places: counts[id] };
        })
      });
    }
    // The first time there are visits, frame them (but never closer than a country).
    if (!fitted && state.visits.length) {
      fitted = true;
      var bounds = L.latLngBounds(state.visits.map(function (v) { return [v.latitude, v.longitude]; }));
      map.fitBounds(bounds.pad(0.5), { maxZoom: 4 });
    }
  }

  function update(next) {
    state = next;
    draw();
  }

  fetch(CONFIG.countriesUrl, { integrity: CONFIG.countriesHash })
    .then(function (response) { return response.json(); })
    .then(function (world) {
      var features = topojson.feature(world, world.objects.countries).features
        .filter(function (f) { return f.geometry; });
      countries = features.map(function (f) { return { feature: f, bounds: gohistBounds(f.geometry) }; });
      // Antarctica's outline runs along the bottom edge of the world, which a flat map can't draw.
      var drawn = features
        .filter(function (f) { return f.id !== '010'; })
        .map(function (f) { return { type: 'Feature', id: f.id, properties: f.properties, geometry: gohistUnwrap(f.geometry) }; });
      countriesLayer = L.geoJSON(drawn, { style: countryStyle, interactive: false }).addTo(map);
      countriesLayer.bringToBack();
      draw();
    })
    .catch(function () {
      note("Couldn't load the world map. Check your connection.");
      send({ type: 'error', message: 'countries' });
    });

  window.gohistUpdate = update;
  window.addEventListener('message', function (event) {
    if (event.data && event.data.source === 'gohist-app') update(event.data.state);
  });

  restyle();
  send({ type: 'ready' });
})();
`;
