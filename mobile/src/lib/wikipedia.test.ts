import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceInMetres, offsetCoordinates } from './geo.ts';
import { MAX_SEARCH_RADIUS_METRES, searchCircles } from './wikipedia.ts';

const centre = { latitude: 48.8584, longitude: 2.2945 };

test('areas up to 10 km are one Wikipedia search', () => {
  assert.deepEqual(searchCircles(centre, 2000), [{ centre, radiusMetres: 2000 }]);
  assert.deepEqual(searchCircles(centre, 10_000), [{ centre, radiusMetres: 10_000 }]);
});

for (const radius of [12_000, 18_000, 25_000]) {
  test(`a ${radius / 1000} km area is covered by 10 km searches with no gaps`, () => {
    const circles = searchCircles(centre, radius);
    assert.equal(circles.length, 10);
    assert.ok(circles.every((circle) => circle.radiusMetres <= MAX_SEARCH_RADIUS_METRES));
    // Check points every 500 m out and every 2 degrees around.
    for (let distance = 0; distance <= radius; distance += 500) {
      for (let bearing = 0; bearing < 360; bearing += 2) {
        const point = offsetCoordinates(centre, distance, bearing);
        const covered = circles.some((circle) => distanceInMetres(circle.centre, point) <= circle.radiusMetres);
        assert.ok(covered, `${distance} m at ${bearing}° is not covered`);
      }
    }
  });
}

test('areas wider than 25 km are searched as 25 km', () => {
  const circles = searchCircles(centre, 50_000);
  const reach = Math.max(...circles.map((circle) => distanceInMetres(centre, circle.centre) + circle.radiusMetres));
  assert.ok(reach < 30_000);
});

test('moving a point keeps the distance and wraps across the date line', () => {
  const moved = offsetCoordinates({ latitude: 0, longitude: 179.95 }, 20_000, 90);
  assert.ok(moved.longitude < -179);
  assert.ok(Math.abs(distanceInMetres({ latitude: 0, longitude: 179.95 }, moved) - 20_000) < 1);
});
