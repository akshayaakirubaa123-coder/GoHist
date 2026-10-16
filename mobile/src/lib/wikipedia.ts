import type { Coordinates } from './geo.ts';
import { searchLanguages, type LanguageCode } from './languages.ts';
import {
  localizePlaces,
  mergeArticles,
  needsTranslation,
  type Place,
  type WikidataText,
  type WikipediaArticle,
} from './places.ts';

// Wikimedia asks every app to identify itself so they can contact the developer
// if the app causes problems. Browsers block the normal User-Agent header, so
// Wikimedia also accepts this one.
const API_USER_AGENT = 'GoHist/0.1 (https://github.com/akshayaakirubaa123-coder/GoHist)';

// Wikidata returns at most 50 items per request.
const WIKIDATA_BATCH_SIZE = 50;

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
  language: LanguageCode,
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

type WikidataEntity = {
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
};

/** Looks up each Wikidata item's name and description in `language`. */
async function fetchWikidataText(ids: string[], language: LanguageCode): Promise<Map<string, WikidataText>> {
  const text = new Map<string, WikidataText>();
  for (let start = 0; start < ids.length; start += WIKIDATA_BATCH_SIZE) {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      format: 'json',
      origin: '*',
      ids: ids.slice(start, start + WIKIDATA_BATCH_SIZE).join('|'),
      props: 'labels|descriptions',
      // Only this language: we never want Wikidata to quietly fall back to another one.
      languages: language,
    });
    const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
      headers: { 'Api-User-Agent': API_USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`www.wikidata.org returned ${response.status}`);
    }
    const body: { entities?: Record<string, WikidataEntity> } = await response.json();
    for (const [id, entity] of Object.entries(body.entities ?? {})) {
      text.set(id, {
        label: entity.labels?.[language]?.value,
        description: entity.descriptions?.[language]?.value,
      });
    }
  }
  return text;
}

/**
 * Finds Wikipedia articles about places near `location` and shows them in
 * `language` wherever possible. It searches that language's Wikipedia plus
 * English and Spanish ones; for places that only have an article in another
 * language, it uses the place's name and description from Wikidata.
 * Wikipedia's search radius is capped at 10 km.
 */
export async function fetchNearbyPlaces(
  location: Coordinates,
  radiusMetres: number,
  language: LanguageCode,
): Promise<Place[]> {
  const languages = searchLanguages(language);
  const results = await Promise.allSettled(
    languages.map((code) => fetchArticles(code, location, radiusMetres)),
  );
  const articles = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  // Only fail if every language failed; one working source is still useful.
  if (articles.length === 0) {
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }
  const places = mergeArticles(articles, location, languages);

  const ids = places.flatMap((place) =>
    place.wikidataId && needsTranslation(place, language) ? [place.wikidataId] : [],
  );
  if (ids.length === 0) return places;
  try {
    return localizePlaces(places, language, await fetchWikidataText(ids, language));
  } catch {
    // Without Wikidata the places are still correct, just in their original language.
    return places;
  }
}
