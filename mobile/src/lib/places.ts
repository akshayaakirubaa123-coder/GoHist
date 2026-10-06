import { distanceInMetres, type Coordinates } from './geo.ts';

export type WikipediaLanguage = 'en' | 'es';

/** One Wikipedia article about a place, as returned by the GeoSearch API. */
export type WikipediaArticle = {
  language: WikipediaLanguage;
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
  summary?: string;
  thumbnailUrl?: string;
  coordinates: Coordinates;
  distanceMetres: number;
  sources: { language: WikipediaLanguage; url: string }[];
};

/**
 * Combines articles from several Wikipedia languages into one list of places.
 * Articles about the same place are matched by their Wikidata ID, so a castle
 * with both an English and a Spanish article appears once, with both sources.
 * Earlier languages in `preferredOrder` provide the title and summary.
 */
export function mergeArticles(
  articles: WikipediaArticle[],
  userLocation: Coordinates,
  preferredOrder: WikipediaLanguage[] = ['en', 'es'],
): Place[] {
  const rank = (language: WikipediaLanguage) => preferredOrder.indexOf(language);
  const sorted = [...articles].sort((a, b) => rank(a.language) - rank(b.language));

  const places = new Map<string, Place>();
  for (const article of sorted) {
    const key = article.wikidataId ?? `${article.language}:${article.pageId}`;
    const existing = places.get(key);
    if (existing) {
      existing.sources.push({ language: article.language, url: article.url });
      existing.summary ??= article.summary;
      existing.thumbnailUrl ??= article.thumbnailUrl;
      continue;
    }
    places.set(key, {
      id: key,
      title: article.title,
      summary: article.summary,
      thumbnailUrl: article.thumbnailUrl,
      coordinates: article.coordinates,
      distanceMetres: distanceInMetres(userLocation, article.coordinates),
      sources: [{ language: article.language, url: article.url }],
    });
  }

  return [...places.values()].sort((a, b) => a.distanceMetres - b.distanceMetres);
}
