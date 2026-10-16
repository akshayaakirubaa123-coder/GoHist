import type { Visit } from './visits.ts';

/** A visit as stored in the "visits" table online (see supabase/schema.sql). */
export type VisitRow = {
  user_id: string;
  place_id: string;
  title: string;
  latitude: number;
  longitude: number;
  thumbnail_url: string | null;
  source_url: string | null;
  visited_at: string;
};

export function visitToRow(visit: Visit, userId: string): VisitRow {
  return {
    user_id: userId,
    place_id: visit.id,
    title: visit.title,
    latitude: visit.coordinates.latitude,
    longitude: visit.coordinates.longitude,
    thumbnail_url: visit.thumbnailUrl ?? null,
    source_url: visit.sourceUrl ?? null,
    visited_at: visit.visitedAt,
  };
}

export function rowToVisit(row: VisitRow): Visit {
  return {
    id: row.place_id,
    title: row.title,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    thumbnailUrl: row.thumbnail_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    visitedAt: new Date(row.visited_at).toISOString(),
  };
}

/**
 * Combines the log on this phone with the one saved to your account, keeping
 * the earliest visit to each place. Returns `local` itself when the account
 * adds nothing, so callers can skip saving.
 */
export function mergeVisits(local: Visit[], remote: Visit[]): Visit[] {
  const byId = new Map(local.map((visit) => [visit.id, visit]));
  let changed = false;
  for (const visit of remote) {
    const mine = byId.get(visit.id);
    if (!mine || visit.visitedAt < mine.visitedAt) {
      byId.set(visit.id, visit);
      changed = true;
    }
  }
  return changed ? [...byId.values()] : local;
}
