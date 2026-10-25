/** A Wikipedia language code, such as "en" for English or "es" for Spanish. */
export type LanguageCode = string;

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

type Language = { code: LanguageCode; name: string; nativeName: string };

/**
 * Languages the user can choose to read place information in. Each one has its
 * own large Wikipedia (https://<code>.wikipedia.org), and the phone can
 * translate into it with ML Kit and read it aloud. English comes first; the
 * rest are in alphabetical order of their English names.
 */
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

/**
 * Names of languages that places can come from (as the local language of an
 * area) but that aren't offered in the picker, usually because the phone
 * can't translate them.
 */
const OTHER_LANGUAGE_NAMES: Record<LanguageCode, string> = {
  af: 'Afrikaans',
  az: 'Azerbaijani',
  be: 'Belarusian',
  bg: 'Bulgarian',
  bs: 'Bosnian',
  et: 'Estonian',
  eu: 'Basque',
  gl: 'Galician',
  hr: 'Croatian',
  hy: 'Armenian',
  is: 'Icelandic',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Khmer',
  lo: 'Lao',
  lt: 'Lithuanian',
  lv: 'Latvian',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mt: 'Maltese',
  my: 'Burmese',
  ne: 'Nepali',
  or: 'Odia',
  pa: 'Punjabi',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  sq: 'Albanian',
  sr: 'Serbian',
  sw: 'Swahili',
  uz: 'Uzbek',
  cy: 'Welsh',
};

/** The English name of a language, e.g. "Spanish" for "es". Unknown codes are shown as-is. */
export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? OTHER_LANGUAGE_NAMES[code] ?? code;
}

/**
 * The main language of each country's Wikipedia, by ISO country code.
 * Countries whose main language is English, or that have no sizeable
 * Wikipedia in a local language, are left out.
 */
const COUNTRY_LANGUAGES: Record<string, LanguageCode> = {
  // Europe
  AD: 'ca', AL: 'sq', AM: 'hy', AT: 'de', AZ: 'az', BA: 'bs', BE: 'nl', BG: 'bg', BY: 'be',
  CH: 'de', CY: 'el', CZ: 'cs', DE: 'de', DK: 'da', EE: 'et', ES: 'es', FI: 'fi', FR: 'fr',
  GE: 'ka', GR: 'el', HR: 'hr', HU: 'hu', IS: 'is', IT: 'it', LI: 'de', LT: 'lt', LU: 'fr',
  LV: 'lv', MC: 'fr', MD: 'ro', ME: 'sr', MK: 'mk', MT: 'mt', NL: 'nl', NO: 'no', PL: 'pl',
  PT: 'pt', RO: 'ro', RS: 'sr', RU: 'ru', SE: 'sv', SI: 'sl', SK: 'sk', SM: 'it', UA: 'uk',
  VA: 'it', XK: 'sq',
  // Middle East and North Africa
  AE: 'ar', BH: 'ar', DZ: 'ar', EG: 'ar', IL: 'he', IQ: 'ar', IR: 'fa', JO: 'ar', KW: 'ar',
  LB: 'ar', LY: 'ar', MA: 'ar', OM: 'ar', PS: 'ar', QA: 'ar', SA: 'ar', SY: 'ar', TN: 'ar',
  TR: 'tr', YE: 'ar',
  // Asia
  AF: 'fa', BD: 'bn', CN: 'zh', HK: 'zh', ID: 'id', IN: 'hi', JP: 'ja', KH: 'km', KR: 'ko',
  KZ: 'kk', LA: 'lo', LK: 'si', MM: 'my', MN: 'mn', MO: 'zh', MY: 'ms', NP: 'ne', PH: 'tl',
  PK: 'ur', TH: 'th', TW: 'zh', UZ: 'uz', VN: 'vi',
  // Americas
  AR: 'es', BO: 'es', BR: 'pt', CL: 'es', CO: 'es', CR: 'es', CU: 'es', DO: 'es', EC: 'es',
  GT: 'es', HN: 'es', HT: 'fr', MX: 'es', NI: 'es', PA: 'es', PE: 'es', PR: 'es', PY: 'es',
  SV: 'es', UY: 'es', VE: 'es',
  // Africa
  AO: 'pt', BF: 'fr', BJ: 'fr', CD: 'fr', CI: 'fr', CM: 'fr', CV: 'pt', GA: 'fr', GN: 'fr',
  KE: 'sw', MG: 'fr', ML: 'fr', MZ: 'pt', NE: 'fr', SN: 'fr', TD: 'fr', TG: 'fr', TZ: 'sw',
};

/**
 * Regions whose language differs from the rest of their country. Keyed by
 * country, then by region name or code as the phone reports it (lowercase,
 * without accents), since phones give either.
 */
const REGION_LANGUAGES: Record<string, Record<string, LanguageCode>> = {
  BE: { wallonia: 'fr', wallonie: 'fr', wal: 'fr', brussels: 'fr', bruxelles: 'fr', bru: 'fr' },
  CA: { quebec: 'fr', qc: 'fr' },
  CH: {
    geneva: 'fr', geneve: 'fr', ge: 'fr', vaud: 'fr', vd: 'fr', neuchatel: 'fr', ne: 'fr',
    jura: 'fr', ju: 'fr', ticino: 'it', ti: 'it',
  },
  ES: {
    catalonia: 'ca', cataluna: 'ca', catalunya: 'ca', ct: 'ca', 'basque country': 'eu',
    'pais vasco': 'eu', euskadi: 'eu', pv: 'eu', galicia: 'gl', ga: 'gl',
  },
  IN: {
    'tamil nadu': 'ta', tn: 'ta', puducherry: 'ta', kerala: 'ml', kl: 'ml', karnataka: 'kn', ka: 'kn',
    'andhra pradesh': 'te', ap: 'te', telangana: 'te', tg: 'te', ts: 'te', maharashtra: 'mr', mh: 'mr',
    goa: 'mr', 'west bengal': 'bn', wb: 'bn', tripura: 'bn', gujarat: 'gu', gj: 'gu', punjab: 'pa',
    pb: 'pa', odisha: 'or', or: 'or', od: 'or',
  },
  LK: { northern: 'ta', 'northern province': 'ta', eastern: 'ta', 'eastern province': 'ta' },
  US: { 'puerto rico': 'es' },
};

function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * The main local language where someone is, from the country (ISO code, e.g.
 * "FR") and region the phone reports. Undefined when it isn't known or is English.
 */
export function localLanguage(countryCode?: string | null, region?: string | null): LanguageCode | undefined {
  if (!countryCode) return undefined;
  const country = countryCode.toUpperCase();
  const regional = region ? REGION_LANGUAGES[country]?.[normalise(region)] : undefined;
  return regional ?? COUNTRY_LANGUAGES[country];
}

/**
 * Wikipedias to search for nearby places, best first: the user's language,
 * then English (the largest), then the local language of the area, if known.
 * Searching more than one finds places that only have an article in another
 * language, and local Wikipedias know the most about their own area. Kept to
 * three so each search makes a modest number of requests.
 */
export function searchLanguages(chosen: LanguageCode, local?: LanguageCode): LanguageCode[] {
  return [...new Set([chosen, 'en', ...(local ? [local] : [])])];
}
