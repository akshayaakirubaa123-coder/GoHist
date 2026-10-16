import type { Coordinates } from './geo.ts';
import type { LanguageCode } from './languages.ts';
import type { Visit } from './visits.ts';
import { API_USER_AGENT } from './wikipedia.ts';

const RESULTS = 15;

/** A place found by name, which you can add to your passport. */
export type PlaceSearchResult = {
  /** Same ID the place has elsewhere in the app, so it isn't logged twice. */
  id: string;
  title: string;
  /** A few words saying what it is, e.g. "Capital city of France". */
  description?: string;
  coordinates: Coordinates;
  thumbnailUrl?: string;
  url: string;
};

type SearchPage = {
  pageid: number;
  title: string;
  index?: number;
  fullurl: string;
  description?: string;
  thumbnail?: { source: string };
  coordinates?: { lat: number; lon: number }[];
  pageprops?: { wikibase_item?: string };
};

/** Turns a Wikipedia search response into places, best match first. Articles with no location are left out. */
export function parsePlaceSearch(
  body: { query?: { pages?: SearchPage[] } },
  language: LanguageCode,
): PlaceSearchResult[] {
  return [...(body.query?.pages ?? [])]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap((page) => {
      const point = page.coordinates?.[0];
      if (!point) return [];
      return [
        {
          // Matches how nearby places are identified (see mergeArticles).
          id: page.pageprops?.wikibase_item ?? `${language}:${page.pageid}`,
          title: page.title,
          description: page.description || undefined,
          coordinates: { latitude: point.lat, longitude: point.lon },
          thumbnailUrl: page.thumbnail?.source,
          url: page.fullurl,
        },
      ];
    });
}

/** Looks up landmarks, cities and other places on Wikipedia by name. */
export async function searchPlaces(query: string, language: LanguageCode): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(RESULTS),
    gsrnamespace: '0',
    prop: 'coordinates|pageimages|pageprops|info|description',
    inprop: 'url',
    ppprop: 'wikibase_item',
    piprop: 'thumbnail',
    pithumbsize: '240',
    colimit: String(RESULTS),
  });
  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`${language}.wikipedia.org returned ${response.status}`);
  }
  return parsePlaceSearch(await response.json(), language);
}

export function visitFromSearchResult(result: PlaceSearchResult, when: Date): Visit {
  return {
    id: result.id,
    title: result.title,
    coordinates: result.coordinates,
    thumbnailUrl: result.thumbnailUrl,
    sourceUrl: result.url,
    visitedAt: when.toISOString(),
  };
}

/** A calendar date picked by hand. `month` runs from 1 to 12. */
export type VisitDate = { year: number; month: number; day: number };

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dateFrom(when: Date): VisitDate {
  return { year: when.getFullYear(), month: when.getMonth() + 1, day: when.getDate() };
}

/**
 * Moves one part of a date up or down, wrapping the day and month around and
 * never going past `today`. A day that doesn't exist in the new month (31
 * February, say) becomes that month's last day.
 */
export function stepDate(date: VisitDate, part: keyof VisitDate, by: number, today: VisitDate): VisitDate {
  let { year, month, day } = date;
  if (part === 'year') year += by;
  if (part === 'month') month = ((month - 1 + by + 12 * 1000) % 12) + 1;
  if (part === 'day') day = ((day - 1 + by + 31 * 1000) % daysInMonth(year, month)) + 1;
  day = Math.min(day, daysInMonth(year, month));
  const next = { year, month, day };
  return compareDates(next, today) > 0 ? today : next;
}

function compareDates(a: VisitDate, b: VisitDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Midday on that date in your time zone, so it reads as the same day wherever the log is shown. */
export function toLocalNoon(date: VisitDate): Date {
  return new Date(date.year, date.month - 1, date.day, 12);
}
