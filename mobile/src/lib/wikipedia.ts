import { distanceInMetres, offsetCoordinates, type Coordinates } from './geo.ts';
import { searchLanguages, type LanguageCode } from './languages.ts';
import {
  localizePlaces,
  mergeArticles,
  needsTranslation,
  type Place,
  type TranslatedText,
  type WikidataText,
  type WikipediaArticle,
} from './places.ts';

// Wikimedia asks every app to identify itself so they can contact the developer
// if the app causes problems. Browsers block the normal User-Agent header, so
// Wikimedia also accepts this one.
export const API_USER_AGENT = 'GoHist/0.1 (https://github.com/akshayaakirubaa123-coder/GoHist)';

// Wikidata returns at most 50 items per request.
const WIKIDATA_BATCH_SIZE = 50;

// Wikipedia's nearby search only looks up to 10 km from a point.
export const MAX_SEARCH_RADIUS_METRES = 10_000;

// The widest area the app searches. Wider areas are covered by several 10 km searches.
export const MAX_RADIUS_METRES = 25_000;

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
    exsentences: '3',
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
 * The 10 km circles to search so that together they cover every point within
 * `radiusMetres` of `centre`: one circle in the middle and, for areas wider
 * than 10 km, a ring of nine around it. Nine circles 73.6% of the way out
 * leave no gaps for any radius up to 25 km.
 */
export function searchCircles(
  centre: Coordinates,
  radiusMetres: number,
): { centre: Coordinates; radiusMetres: number }[] {
  const radius = Math.min(radiusMetres, MAX_RADIUS_METRES);
  if (radius <= MAX_SEARCH_RADIUS_METRES) return [{ centre, radiusMetres: radius }];
  const ring = Array.from({ length: 9 }, (_, i) => ({
    centre: offsetCoordinates(centre, radius * 0.736, i * 40),
    radiusMetres: MAX_SEARCH_RADIUS_METRES,
  }));
  return [{ centre, radiusMetres: MAX_SEARCH_RADIUS_METRES }, ...ring];
}

/** Searches each of `searchCircles` and keeps one copy of each article that's inside the radius. */
async function fetchArticlesWithin(
  language: LanguageCode,
  location: Coordinates,
  radiusMetres: number,
): Promise<WikipediaArticle[]> {
  const circles = searchCircles(location, radiusMetres);
  if (circles.length === 1) return fetchArticles(language, location, circles[0].radiusMetres);
  const results = await Promise.allSettled(
    circles.map((circle) => fetchArticles(language, circle.centre, circle.radiusMetres)),
  );
  // The middle circle matters most, so its failure fails this language.
  if (results[0].status === 'rejected') throw results[0].reason;
  const articles = new Map<number, WikipediaArticle>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const article of result.value) {
      // The outer circles reach past the edge of the area.
      if (distanceInMetres(location, article.coordinates) <= radiusMetres) articles.set(article.pageId, article);
    }
  }
  return [...articles.values()];
}

/** Translates text from one language to another, or returns undefined if it can't. */
export type Translator = (text: string, from: LanguageCode, to: LanguageCode) => Promise<string | undefined>;

/** Translates each place's untranslated title and summary into `language`. */
async function translatePlaces(
  places: Place[],
  language: LanguageCode,
  translate: Translator,
): Promise<Map<string, TranslatedText>> {
  const entries = await Promise.all(
    places.map(async (place): Promise<[string, TranslatedText]> => {
      const [title, summary] = await Promise.all([
        place.titleLanguage !== language ? translate(place.title, place.titleLanguage, language) : undefined,
        place.summary && place.summaryLanguage && place.summaryLanguage !== language
          ? translate(place.summary, place.summaryLanguage, language)
          : undefined,
      ]);
      return [place.id, { title, summary }];
    }),
  );
  return new Map(entries);
}

/**
 * Finds Wikipedia articles about places near `location` and shows them in
 * `language` wherever possible. It searches that language's Wikipedia, the
 * English one and, if given, the one in `localLanguage` (the language spoken
 * where the places are, see `areaLanguage`). Articles about the same place in
 * several languages become one place. For places that only have an article in another
 * language, it uses the place's name and short description from Wikidata.
 * Areas wider than 10 km (Wikipedia's limit), up to 25 km, are searched in
 * several overlapping 10 km pieces.
 *
 * Translating can be slow (the phone may first download a language model), so
 * the places are returned straight away and, if `translation` is given, its
 * `translate` runs afterwards and `onTranslated` receives the improved list,
 * with full summaries translated in place of the short descriptions.
 */
export async function fetchNearbyPlaces(
  location: Coordinates,
  radiusMetres: number,
  language: LanguageCode,
  localLanguage?: LanguageCode,
  translation?: {
    translate: Translator;
    onTranslated: (places: Place[]) => void;
  },
): Promise<Place[]> {
  const languages = searchLanguages(language, localLanguage);
  const results = await Promise.allSettled(languages.map((code) => fetchArticlesWithin(code, location, radiusMetres)));
  const articles = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  // Only fail if every language failed; one working source is still useful.
  if (articles.length === 0) {
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }
  const places = mergeArticles(articles, location, languages);

  const untranslated = places.filter((place) => needsTranslation(place, language));
  if (untranslated.length === 0) return places;
  const ids = untranslated.flatMap((place) => (place.wikidataId ? [place.wikidataId] : []));
  // Without Wikidata the places are still correct, just in their original language.
  const wikidataText =
    ids.length > 0 ? await fetchWikidataText(ids, language).catch(() => new Map<string, WikidataText>()) : new Map();

  if (translation) {
    translatePlaces(untranslated, language, translation.translate)
      .then((translations) => {
        if ([...translations.values()].some((text) => text.title || text.summary)) {
          translation.onTranslated(localizePlaces(places, language, wikidataText, translations));
        }
      })
      .catch(() => {});
  }
  return localizePlaces(places, language, wikidataText);
}
