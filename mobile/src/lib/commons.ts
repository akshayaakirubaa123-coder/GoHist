import type { Coordinates } from './geo.ts';

// Wikimedia asks every app to identify itself (see wikipedia.ts).
const API_USER_AGENT = 'GoHist/0.1 (https://github.com/akshayaakirubaa123-coder/GoHist)';

/** Photos taken in or before this year count as "then". */
export const THEN_CUTOFF_YEAR = 1960;

/** Photos taken in or after this year can be the "now" photo. */
export const NOW_FROM_YEAR = 2005;

/** A photo on Wikimedia Commons that was taken near a place. */
export type CommonsPhoto = {
  title: string;
  imageUrl: string;
  /** The photo's page on Commons, with its full description and licence. */
  pageUrl: string;
  /** Year the photo was taken, when Commons records it. */
  year?: number;
  author?: string;
  licence?: string;
};

/** Old photos of a spot, oldest first, and a recent one to compare them with. */
export type ThenAndNow = { then: CommonsPhoto[]; now?: CommonsPhoto };

type MetadataValue = { value?: string };

type CommonsPage = {
  title: string;
  imageinfo?: {
    thumburl?: string;
    url: string;
    descriptionurl: string;
    extmetadata?: {
      DateTimeOriginal?: MetadataValue;
      Artist?: MetadataValue;
      LicenseShortName?: MetadataValue;
    };
  }[];
};

/**
 * The year a photo was taken, from Commons' "date" field. The field is free
 * text: "1890", "circa 1925", "2019-06-01 12:00:00", or HTML with a <time> tag.
 * Returns the first plausible year in it, or undefined.
 */
export function parsePhotoYear(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const match = stripHtml(raw).match(/\b(1[89]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

/** Turns Commons' HTML snippets (author links, etc.) into plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits photos into old ones ("then", oldest first) and the newest recent one
 * ("now"). Photos with no known year, or from in between, are left out, so the
 * comparison is only made with photos whose age we actually know.
 */
export function pickThenAndNow(photos: CommonsPhoto[]): ThenAndNow {
  const dated = photos.filter((photo) => photo.year !== undefined) as (CommonsPhoto & { year: number })[];
  const then = dated.filter((photo) => photo.year <= THEN_CUTOFF_YEAR).sort((a, b) => a.year - b.year);
  const recent = dated.filter((photo) => photo.year >= NOW_FROM_YEAR).sort((a, b) => b.year - a.year);
  return { then, now: recent[0] };
}

/**
 * Finds photos on Wikimedia Commons that were taken within `radiusMetres` of
 * `location`. Commons stores where many photos were taken, including scanned
 * old photographs and postcards.
 */
export async function fetchNearbyPhotos(location: Coordinates, radiusMetres = 300): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${location.latitude}|${location.longitude}`,
    ggsradius: String(radiusMetres),
    // Namespace 6 is files (photos), rather than gallery or category pages.
    ggsnamespace: '6',
    ggslimit: '100',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '800',
    iiextmetadatafilter: 'DateTimeOriginal|Artist|LicenseShortName',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`commons.wikimedia.org returned ${response.status}`);
  }
  const body: { query?: { pages?: CommonsPage[] } } = await response.json();
  return (body.query?.pages ?? []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    // Only photos, not maps, drawings in PDF, audio or video.
    if (!info || !/\.(jpe?g|png|tiff?|webp)$/i.test(page.title)) return [];
    const meta = info.extmetadata ?? {};
    const author = meta.Artist?.value ? stripHtml(meta.Artist.value) : undefined;
    return [
      {
        title: page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
        imageUrl: info.thumburl ?? info.url,
        pageUrl: info.descriptionurl,
        year: parsePhotoYear(meta.DateTimeOriginal?.value),
        author: author || undefined,
        licence: meta.LicenseShortName?.value,
      },
    ];
  });
}
