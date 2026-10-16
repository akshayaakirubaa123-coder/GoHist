import { distanceInMetres, type Coordinates } from './geo.ts';
import type { Place } from './places.ts';

/** A city or area saved on the phone, to use without internet. */
export type SavedArea = {
  id: string;
  name: string;
  center: Coordinates;
  /** Language the places were saved in. */
  language: string;
  /** When it was downloaded, as an ISO date-time. */
  savedAt: string;
  places: Place[];
};

// Wikipedia's nearby search returns at most 20 places per language per search,
// so a city is searched as a grid of overlapping circles.
export const DOWNLOAD_SEARCH_RADIUS_METRES = 2500;
const GRID_STEP_METRES = 3500;
const METRES_PER_DEGREE_LATITUDE = 111_320;

/**
 * Centres of the circles that cover a square `spanMetres` wide around `center`.
 * With a 3.5 km step and 2.5 km circles, neighbouring circles overlap so no
 * street between them is missed.
 */
export function downloadGrid(center: Coordinates, spanMetres: number): Coordinates[] {
  const steps = Math.max(0, Math.round(spanMetres / 2 / GRID_STEP_METRES));
  const metresPerDegreeLongitude = METRES_PER_DEGREE_LATITUDE * Math.cos((center.latitude * Math.PI) / 180);
  const points: Coordinates[] = [];
  for (let row = -steps; row <= steps; row++) {
    for (let column = -steps; column <= steps; column++) {
      points.push({
        latitude: center.latitude + (row * GRID_STEP_METRES) / METRES_PER_DEGREE_LATITUDE,
        longitude: center.longitude + (column * GRID_STEP_METRES) / metresPerDegreeLongitude,
      });
    }
  }
  // Nearest the centre first, so a download stopped early still has the middle of the city.
  return points.sort((a, b) => distanceInMetres(center, a) - distanceInMetres(center, b));
}

/** Combines places found by several searches, keeping one of each, nearest `center` first. */
export function combinePlaces(batches: Place[][], center: Coordinates): Place[] {
  const byId = new Map<string, Place>();
  for (const place of batches.flat()) {
    if (!byId.has(place.id)) byId.set(place.id, place);
  }
  return [...byId.values()]
    .map((place) => ({ ...place, distanceMetres: distanceInMetres(center, place.coordinates) }))
    .sort((a, b) => a.distanceMetres - b.distanceMetres);
}

/**
 * Saved places within `radiusMetres` of `here`, from every downloaded area,
 * with distances measured from `here`. Used when there's no internet.
 */
export function savedPlacesNear(areas: SavedArea[], here: Coordinates, radiusMetres: number): Place[] {
  return combinePlaces(
    areas.map((area) => area.places),
    here,
  ).filter((place) => place.distanceMetres <= radiusMetres);
}
