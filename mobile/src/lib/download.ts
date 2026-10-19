import type { Coordinates } from './geo.ts';
import type { LanguageCode } from './languages.ts';
import { combinePlaces, downloadGrid, DOWNLOAD_SEARCH_RADIUS_METRES, type SavedArea } from './offline.ts';
import type { Place } from './places.ts';
import { fetchNearbyPlaces } from './wikipedia.ts';

const API_USER_AGENT = 'GoHist/0.1 (https://github.com/akshayaakirubaa123-coder/GoHist)';

/** How wide an area "download this city" covers: a square about 14 km across. */
export const CITY_SPAN_METRES = 14000;

/** A city found by name, with where its Wikipedia article puts it. */
export type FoundCity = { name: string; center: Coordinates };

/**
 * Looks a city up on Wikipedia by name and returns where it is. Works on every
 * platform, unlike the phone's own geocoder, and uses the same source as the
 * rest of the app.
 */
export async function findCity(query: string, language: LanguageCode): Promise<FoundCity | undefined> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '5',
    prop: 'coordinates',
    redirects: '1',
  });
  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) throw new Error(`${language}.wikipedia.org returned ${response.status}`);
  const body: {
    query?: { pages?: { title: string; index: number; coordinates?: { lat: number; lon: number }[] }[] };
  } = await response.json();
  const best = (body.query?.pages ?? [])
    .filter((page) => page.coordinates?.[0])
    .sort((a, b) => a.index - b.index)[0];
  if (!best?.coordinates) return undefined;
  return { name: best.title, center: { latitude: best.coordinates[0].lat, longitude: best.coordinates[0].lon } };
}

/**
 * Downloads every Wikipedia-documented place in a city-sized area around
 * `center`, by searching a grid of overlapping circles one at a time (to stay
 * within Wikimedia's rate limits). `onProgress` gets the share done, 0 to 1.
 */
export async function downloadArea(
  name: string,
  center: Coordinates,
  language: LanguageCode,
  localLanguage: LanguageCode | undefined,
  onProgress: (done: number) => void,
): Promise<SavedArea> {
  const points = downloadGrid(center, CITY_SPAN_METRES);
  const batches: Place[][] = [];
  let failures = 0;
  for (const [index, point] of points.entries()) {
    try {
      batches.push(await fetchNearbyPlaces(point, DOWNLOAD_SEARCH_RADIUS_METRES, language, localLanguage));
    } catch {
      failures++;
    }
    onProgress((index + 1) / points.length);
  }
  if (failures === points.length) throw new Error('No connection to Wikipedia');
  return {
    id: `${center.latitude.toFixed(3)},${center.longitude.toFixed(3)}:${language}`,
    name,
    center,
    language,
    savedAt: new Date().toISOString(),
    places: combinePlaces(batches, center),
  };
}
