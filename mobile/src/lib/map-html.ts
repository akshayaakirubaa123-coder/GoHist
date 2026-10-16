import type { Coordinates } from './geo.ts';

/** What the app tells the map to show. */
export type MapState = {
  /** The centre of the search: your location, or a spot you picked. Missing until there is one. */
  here?: Coordinates;
  /** True when you're choosing a spot by tapping the map rather than using your location. */
  picking: boolean;
  radiusMetres: number;
  places: { id: string; title: string; latitude: number; longitude: number }[];
  selectedId?: string;
};

/** Messages the map sends back to the app. */
export type MapEvent =
  | { type: 'ready' }
  | { type: 'select'; id: string }
  /** A tap on the map itself, away from any pin. */
  | { type: 'tap'; latitude: number; longitude: number };

// Leaflet is a small open-source map library. We load a fixed version from a
// CDN; the "integrity" hashes make the browser refuse a file that was changed.
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_HASH = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const LEAFLET_JS_HASH = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

// Free map tiles that need no API key. Both ask for the credit line shown in
// the map's corner.
const TILES = {
  streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  streetsCredit: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  satelliteLabels:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  satelliteCredit: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
};

/**
 * A complete web page that draws the map. The app shows it in a WebView on
 * phones and in an iframe on the web, so both use exactly the same map code.
 * The page and the app talk by sending each other small JSON messages.
 */
export function buildMapHtml({ dark }: { dark: boolean }): string {
  const config = JSON.stringify({ tiles: TILES, dark });
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" integrity="${LEAFLET_CSS_HASH}" crossorigin="">
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" integrity="${LEAFLET_JS_HASH}" crossorigin=""></script>
<style>${MAP_CSS}</style>
</head>
<body class="${dark ? 'dark' : ''}">
<div id="map"></div>
<script>var CONFIG = ${config};</script>
<script>${MAP_SCRIPT}</script>
</body>
</html>`;
}

const MAP_CSS = `
html, body, #map { height: 100%; margin: 0; }
body.dark { background: #1b1b1b; }
/* OpenStreetMap has no dark style, so in dark mode we invert the street map's colours. */
body.dark .streets { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }
.pin {
  width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
  background: #b3261e; border: 2px solid #fff; transform: rotate(-45deg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.4); box-sizing: border-box;
}
.pin::after {
  content: ''; position: absolute; width: 8px; height: 8px; border-radius: 50%;
  background: #fff; left: 7px; top: 7px;
}
.pin.selected { background: #7a1610; transform: rotate(-45deg) scale(1.3); }
.me {
  width: 16px; height: 16px; border-radius: 50%; background: #1a73e8;
  border: 3px solid #fff; box-sizing: border-box;
  box-shadow: 0 0 0 6px rgba(26,115,232,0.25), 0 1px 3px rgba(0,0,0,0.4);
}
.spot {
  width: 22px; height: 22px; border-radius: 50%; background: #e8710a;
  border: 3px solid #fff; box-sizing: border-box;
  box-shadow: 0 0 0 6px rgba(232,113,10,0.25), 0 1px 3px rgba(0,0,0,0.4);
}
.picking.leaflet-container { cursor: crosshair; }
.leaflet-tooltip.label { display: none; font-weight: 600; }
.show-labels .spot {
  width: 22px; height: 22px; border-radius: 50%; background: #e8710a;
  border: 3px solid #fff; box-sizing: border-box;
  box-shadow: 0 0 0 6px rgba(232,113,10,0.25), 0 1px 3px rgba(0,0,0,0.4);
}
.picking.leaflet-container { cursor: crosshair; }
.leaflet-tooltip.label { display: block; }
.recenter a { font-size: 18px; }
`;

// Runs inside the map page. Written in plain older JavaScript because it is
// not processed by the app's build tools.
const MAP_SCRIPT = `
(function () {
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([0, 0], 2);

  var streets = L.tileLayer(CONFIG.tiles.streets, {
    attribution: CONFIG.tiles.streetsCredit, maxZoom: 19, className: 'streets'
  }).addTo(map);
  var satellite = L.layerGroup([
    L.tileLayer(CONFIG.tiles.satellite, { attribution: CONFIG.tiles.satelliteCredit, maxZoom: 19 }),
    L.tileLayer(CONFIG.tiles.satelliteLabels, { maxZoom: 19 })
  ]);
  L.control.layers({ 'Streets': streets, 'Satellite': satellite }, null, { position: 'topright' }).addTo(map);

  var meMarker = null;
  var radiusCircle = null;
  var pins = {};
  var lastView = null;
  var state = null;

  var Recenter = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      var box = L.DomUtil.create('div', 'leaflet-bar recenter');
      var button = L.DomUtil.create('a', '', box);
      button.href = '#';
      button.title = 'Back to the search area';
      button.setAttribute('role', 'button');
      button.innerHTML = '&#9678;';
      L.DomEvent.on(button, 'click', function (e) {
        L.DomEvent.stop(e);
        if (radiusCircle) map.fitBounds(radiusCircle.getBounds());
      });
      return box;
    }
  });
  new Recenter().addTo(map);
  // Controls sit top right, so the place card at the bottom never hides them.
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Place names appear next to pins once you zoom in far enough to read them.
  function updateLabels() {
    map.getContainer().classList.toggle('show-labels', map.getZoom() >= 16);
  }
  map.on('zoomend', updateLabels);

  map.on('click', function (e) {
    send({ type: 'tap', latitude: e.latlng.lat, longitude: e.latlng.lng });
  });

  function send(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } else if (window.parent !== window) {
      message.source = 'gohist-map';
      window.parent.postMessage(message, '*');
    }
  }

  function pinIcon(selected) {
    return L.divIcon({
      className: '', html: '<div class="pin' + (selected ? ' selected' : '') + '"></div>',
      iconSize: [26, 26], iconAnchor: [13, 30], tooltipAnchor: [12, -16]
    });
  }

  // A blue dot for your location, an orange one for a spot you picked.
  function centreIcon(picking) {
    return picking
      ? L.divIcon({ className: '', html: '<div class="spot"></div>', iconSize: [22, 22] })
      : L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] });
  }

  function update(next) {
    var previous = state;
    state = next;
    map.getContainer().classList.toggle('picking', !!next.picking);

    if (!next.here) {
      if (meMarker) { map.removeLayer(meMarker); map.removeLayer(radiusCircle); meMarker = null; radiusCircle = null; }
      lastView = null;
    } else {
      var here = [next.here.latitude, next.here.longitude];
      var color = next.picking ? '#e8710a' : '#1a73e8';
      if (!meMarker) {
        meMarker = L.marker(here, {
          icon: centreIcon(next.picking), interactive: false, keyboard: false, zIndexOffset: 1000
        }).addTo(map);
        radiusCircle = L.circle(here, {
          radius: next.radiusMetres, color: color, weight: 1, fillOpacity: 0.04, interactive: false
        }).addTo(map);
      } else {
        meMarker.setLatLng(here);
        if (!previous || !!previous.picking !== !!next.picking) meMarker.setIcon(centreIcon(next.picking));
        radiusCircle.setLatLng(here).setRadius(next.radiusMetres).setStyle({ color: color });
      }

      // Only move the map when the search area changes, not on every tap.
      var view = here.join(',') + '|' + next.radiusMetres;
      if (view !== lastView) {
        lastView = view;
        map.fitBounds(radiusCircle.getBounds());
      }
    }

    var keep = {};
    next.places.forEach(function (place) {
      keep[place.id] = true;
      var selected = place.id === next.selectedId;
      var pin = pins[place.id];
      if (!pin) {
        pin = L.marker([place.latitude, place.longitude], { icon: pinIcon(selected), title: place.title });
        var label = document.createElement('span');
        label.textContent = place.title;
        pin.bindTooltip(label, { permanent: true, direction: 'right', className: 'label' });
        pin.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          send({ type: 'select', id: place.id });
        });
        pin.addTo(map);
        pins[place.id] = pin;
      } else {
        pin.setIcon(pinIcon(selected));
      }
      pin.setZIndexOffset(selected ? 500 : 0);
    });
    Object.keys(pins).forEach(function (id) {
      if (!keep[id]) { map.removeLayer(pins[id]); delete pins[id]; }
    });

    if (next.selectedId && (!previous || previous.selectedId !== next.selectedId) && pins[next.selectedId]) {
      map.panTo(pins[next.selectedId].getLatLng());
    }
    updateLabels();
  }

  // Messages from the app: a function call on phones, postMessage on the web.
  window.gohistUpdate = update;
  window.addEventListener('message', function (event) {
    if (event.data && event.data.source === 'gohist-app') update(event.data.state);
  });

  send({ type: 'ready' });
})();
`;
