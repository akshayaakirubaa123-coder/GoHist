import { distanceInMetres, type Coordinates } from './geo.ts';
import type { LanguageCode } from './languages.ts';

/** One Wikipedia article about a place, as returned by the GeoSearch API. */
export type WikipediaArticle = {
  language: LanguageCode;
  pageId: number;
  title: string;
  summary?: string;
  url: string;
  thumbnailUrl?: string;
  coordinates: Coordinates;
  /** Wikidata ID (e.g. "Q1234"), shared by every language's article about the same place. */
  wikidataId?: string;
};

/** A place shown in the app, possibly backed by articles in several languages. */
export type Place = {
  id: string;
  title: string;
  /** Language the title is written in. */
  titleLanguage: LanguageCode;
  summary?: string;
  /** Language the summary is written in. */
  summaryLanguage?: LanguageCode;
  thumbnailUrl?: string;
  coordinates: Coordinates;
  distanceMetres: number;
  wikidataId?: string;
  sources: { language: LanguageCode; url: string }[];
};

/** A place's name and one-line description in one language, from Wikidata. */
export type WikidataText = { label?: string; description?: string };

/**
 * Combines articles from several Wikipedia languages into one list of places.
 * Articles about the same place are matched by their Wikidata ID, so a castle
 * with both an English and a Spanish article appears once, with both sources.
 * Earlier languages in `preferredOrder` provide the title and summary.
 */
export function mergeArticles(
  articles: WikipediaArticle[],
  userLocation: Coordinates,
  preferredOrder: LanguageCode[] = ['en', 'es'],
): Place[] {
  const rank = (language: LanguageCode) => preferredOrder.indexOf(language);
  const sorted = [...articles].sort((a, b) => rank(a.language) - rank(b.language));

  const places = new Map<string, Place>();
  for (const article of sorted) {
    const key = article.wikidataId ?? `${article.language}:${article.pageId}`;
    const existing = places.get(key);
    if (existing) {
      existing.sources.push({ language: article.language, url: article.url });
      if (!existing.summary && article.summary) {
        existing.summary = article.summary;
        existing.summaryLanguage = article.language;
      }
      existing.thumbnailUrl ??= article.thumbnailUrl;
      continue;
    }
    places.set(key, {
      id: key,
      title: article.title,
      titleLanguage: article.language,
      summary: article.summary,
      summaryLanguage: article.summary ? article.language : undefined,
      thumbnailUrl: article.thumbnailUrl,
      coordinates: article.coordinates,
      distanceMetres: distanceInMetres(userLocation, article.coordinates),
      wikidataId: article.wikidataId,
      sources: [{ language: article.language, url: article.url }],
    });
  }

  return [...places.values()].sort((a, b) => a.distanceMetres - b.distanceMetres);
}

/** Places whose title or summary isn't in `language`, so Wikidata may have a better one. */
export function needsTranslation(place: Place, language: LanguageCode): boolean {
  return place.titleLanguage !== language || (!!place.summary && place.summaryLanguage !== language);
}

/**
 * Swaps in Wikidata's name and description, in the user's language, for places
 * that have no Wikipedia article in that language. Text Wikidata doesn't have
 * stays in its original language, so the card can say which language it's in.
 * `wikidataText` maps Wikidata IDs to their text in `language`.
 */
export function localizePlaces(
  places: Place[],
  language: LanguageCode,
  wikidataText: Map<string, WikidataText>,
): Place[] {
  return places.map((place) => {
    const text = place.wikidataId ? wikidataText.get(place.wikidataId) : undefined;
    if (!text || !needsTranslation(place, language)) return place;
    const localized = { ...place };
    if (place.titleLanguage !== language && text.label) {
      localized.title = text.label;
      localized.titleLanguage = language;
    }
    if (place.summaryLanguage !== language && text.description) {
      localized.summary = capitalize(text.description);
      localized.summaryLanguage = language;
    }
    return localized;
  });
}

/** The first language, other than `language`, that a place's text is shown in. */
export function otherShownLanguage(place: Place, language: LanguageCode): LanguageCode | undefined {
  if (place.titleLanguage !== language) return place.titleLanguage;
  if (place.summary && place.summaryLanguage !== language) return place.summaryLanguage;
  return undefined;
}

// Wikidata descriptions start lowercase ("royal palace in Madrid, Spain").
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
