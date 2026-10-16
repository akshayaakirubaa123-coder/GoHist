import type { LanguageCode } from './languages.ts';
import { API_USER_AGENT, type Translator } from './wikipedia.ts';

/** One part of a Wikipedia article: a heading and the paragraphs under it. */
export type ArticleSection = {
  /** Undefined for the introduction, which has no heading. */
  heading?: string;
  /** 1 for a main section ("== History =="), 2 for a subsection, and so on. */
  level: number;
  paragraphs: string[];
};

/** The full text of a Wikipedia article, as written by its editors. */
export type Article = {
  language: LanguageCode;
  title: string;
  url: string;
  imageUrl?: string;
  sections: ArticleSection[];
  /** Set when the text was machine-translated from this language on the phone. */
  translatedFrom?: LanguageCode;
};

// Sections that only list references or links elsewhere; they read as noise in the app.
const SKIPPED_HEADINGS = new Set(
  [
    // English
    'references', 'notes', 'see also', 'external links', 'further reading', 'bibliography',
    'sources', 'citations', 'footnotes', 'gallery', 'notes and references', 'references and notes',
    // Spanish
    'referencias', 'notas', 'véase también', 'enlaces externos', 'bibliografía', 'galería',
    'fuentes', 'notas y referencias',
    // French, German, Italian, Portuguese, Dutch
    'notes et références', 'voir aussi', 'liens externes', 'bibliographie', 'galerie',
    'literatur', 'weblinks', 'einzelnachweise', 'siehe auch', 'anmerkungen',
    'note', 'voci correlate', 'altri progetti', 'collegamenti esterni', 'bibliografia',
    'referências', 'ver também', 'ligações externas', 'bronnen', 'externe links', 'zie ook',
  ],
);

const HEADING = /^(={2,6})\s*(.+?)\s*\1$/;

/**
 * Splits plain article text from the extracts API (with `exsectionformat=wiki`,
 * so headings look like "== History ==") into sections. Reference and link
 * sections are dropped, along with any headings left with no text under them.
 */
export function parseArticleText(text: string): ArticleSection[] {
  const sections: ArticleSection[] = [{ level: 0, paragraphs: [] }];
  let skipBelowLevel: number | undefined;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length - 1;
      if (skipBelowLevel !== undefined && level > skipBelowLevel) continue;
      skipBelowLevel = SKIPPED_HEADINGS.has(heading[2].toLocaleLowerCase()) ? level : undefined;
      if (skipBelowLevel === undefined) sections.push({ heading: heading[2], level, paragraphs: [] });
      continue;
    }
    if (skipBelowLevel !== undefined) continue;
    sections[sections.length - 1].paragraphs.push(line);
  }

  // Keep a heading only if it, or one of its subsections, has some text.
  return sections.filter((section, index) => {
    if (section.paragraphs.length > 0) return true;
    for (const next of sections.slice(index + 1)) {
      if (next.level <= section.level) return false;
      if (next.paragraphs.length > 0) return true;
    }
    return false;
  });
}

/** The article title in a Wikipedia URL, e.g. "Fort Canning Park" for ".../wiki/Fort_Canning_Park". */
export function articleTitleFromUrl(url: string): string | undefined {
  const match = /\/wiki\/([^?#]+)/.exec(url);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]).replace(/_/g, ' ');
  } catch {
    return undefined;
  }
}

type ArticlePage = {
  title: string;
  fullurl?: string;
  extract?: string;
  missing?: boolean;
  thumbnail?: { source: string };
};

/** Downloads the whole text of one Wikipedia article, split into sections. */
export async function fetchArticle(language: LanguageCode, title: string): Promise<Article> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    titles: title,
    prop: 'extracts|pageimages|info',
    inprop: 'url',
    explaintext: '1',
    exsectionformat: 'wiki',
    piprop: 'thumbnail',
    pithumbsize: '800',
  });
  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`${language}.wikipedia.org returned ${response.status}`);
  }
  const body: { query?: { pages?: ArticlePage[] } } = await response.json();
  const page = body.query?.pages?.[0];
  if (!page || page.missing || !page.extract) {
    throw new Error(`${language}.wikipedia.org has no article called "${title}"`);
  }
  return {
    language,
    title: page.title,
    url: page.fullurl ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    imageUrl: page.thumbnail?.source,
    sections: parseArticleText(page.extract),
  };
}

/**
 * Translates an article's headings and paragraphs into `to`. Any piece that
 * can't be translated stays in the original language. Returns undefined if
 * nothing could be translated at all.
 */
export async function translateArticle(
  article: Article,
  to: LanguageCode,
  translate: Translator,
): Promise<Article | undefined> {
  if (article.language === to) return undefined;
  let translatedAny = false;
  const one = async (text: string) => {
    const result = await translate(text, article.language, to).catch(() => undefined);
    if (result) translatedAny = true;
    return result ?? text;
  };
  const sections = await Promise.all(
    article.sections.map(async (section) => ({
      ...section,
      heading: section.heading && (await one(section.heading)),
      paragraphs: await Promise.all(section.paragraphs.map(one)),
    })),
  );
  return translatedAny ? { ...article, sections, translatedFrom: article.language } : undefined;
}
