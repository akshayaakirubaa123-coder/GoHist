import type { Coordinates } from './geo.ts';
import { mergeArticles, type Place, type WikipediaArticle, type WikipediaLanguage } from './places.ts';

// Wikimedia asks every app to identify itself so they can contact the developer
// if the app causes problems. Browsers block the normal User-Agent header, so
// Wikimedia also accepts this one.
const API_USER_AGENT = 'GoHist/0.1 (https://github.com/akshayaakirubaa123-coder/GoHist)';

// The extracts module returns at most 20 summaries per request, so we ask for 20 places.
const RESULTS_PER_LANGUAGE = 20;

type GeoSearchPage = {
  pageid: number;
  title: string;
  fullurl: string;
  extract?: string;
  thumbnail?: { source: string };
  coordinates?: { lat: number; lon: number }[];
  pageprops?: { wikibase_item?: string };
};

async function fetchArticles(
  language: WikipediaLanguage,
  location: Coordinates,
  radiusMetres: number,
): Promise<WikipediaArticle[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${location.latitude}|${location.longitude}`,
    ggsradius: String(radiusMetres),
    ggslimit: String(RESULTS_PER_LANGUAGE),
    prop: 'coordinates|pageimages|extracts|pageprops|info',
    inprop: 'url',
    ppprop: 'wikibase_item',
    piprop: 'thumbnail',
    pithumbsize: '240',
    exintro: '1',
    explaintext: '1',
    exsentences: '2',
    exlimit: String(RESULTS_PER_LANGUAGE),
  });
  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`${language}.wikipedia.org returned ${response.status}`);
  }
  const body: { query?: { pages?: GeoSearchPage[] } } = await response.json();

  return (body.query?.pages ?? []).flatMap((page) => {
    const point = page.coordinates?.[0];
    if (!point) return [];
    return [
      {
        language,
        pageId: page.pageid,
        title: page.title,
        summary: page.extract || undefined,
        url: page.fullurl,
        thumbnailUrl: page.thumbnail?.source,
        coordinates: { latitude: point.lat, longitude: point.lon },
        wikidataId: page.pageprops?.wikibase_item,
      },
    ];
  });
}

/**
 * Finds Wikipedia articles about places near `location`, in English and Spanish.
 * Wikipedia's search radius is capped at 10 km.
 */
export async function fetchNearbyPlaces(location: Coordinates, radiusMetres: number): Promise<Place[]> {
  const languages: WikipediaLanguage[] = ['en', 'es'];
  const results = await Promise.allSettled(
    languages.map((language) => fetchArticles(language, location, radiusMetres)),
  );
  const articles = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  // Only fail if every language failed; one working source is still useful.
  if (articles.length === 0) {
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }
  return mergeArticles(articles, location);
}
