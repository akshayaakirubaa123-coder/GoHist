import type { Coordinates } from './geo.ts';
import type { Place } from './places.ts';

/** How close you need to be for a place to count as visited. */
export const VISIT_DISTANCE_METRES = 100;

/** A historic place you've been to, kept on the phone. */
export type Visit = {
  id: string;
  title: string;
  coordinates: Coordinates;
  thumbnailUrl?: string;
  sourceUrl?: string;
  /** When you were first there, as an ISO date-time. */
  visitedAt: string;
};

export function visitFromPlace(place: Place, when: Date): Visit {
  return {
    id: place.id,
    title: place.title,
    coordinates: place.coordinates,
    thumbnailUrl: place.thumbnailUrl,
    sourceUrl: place.sources[0]?.url,
    visitedAt: when.toISOString(),
  };
}

/**
 * Adds `places` to the log, keeping the first visit to each place. Returns the
 * same array when nothing is new, so callers can skip saving.
 */
export function addVisits(visits: Visit[], places: Place[], when: Date): Visit[] {
  const known = new Set(visits.map((visit) => visit.id));
  const fresh = places.filter((place) => !known.has(place.id));
  if (fresh.length === 0) return visits;
  const unique = [...new Map(fresh.map((place) => [place.id, place])).values()];
  return [...unique.map((place) => visitFromPlace(place, when)), ...visits];
}

/** Places you're standing at (within VISIT_DISTANCE_METRES). */
export function placesYouAreAt(places: Place[]): Place[] {
  return places.filter((place) => place.distanceMetres <= VISIT_DISTANCE_METRES);
}

/** Newest visits first. */
export function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
}
