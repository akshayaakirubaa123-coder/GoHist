/** A Wikipedia language code, such as "en" for English or "es" for Spanish. */
export type LanguageCode = string;

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Languages the user can choose to read place information in. Each one has its
 * own Wikipedia (https://<code>.wikipedia.org).
 */
export const LANGUAGES: { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

/** The English name of a language, e.g. "Spanish" for "es". Unknown codes are shown as-is. */
export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code;
}

/**
 * Wikipedias to search for nearby places, best first: the user's language,
 * then English, then Spanish. Searching more than one finds places that only
 * have an article in another language.
 */
export function searchLanguages(chosen: LanguageCode): LanguageCode[] {
  return [...new Set([chosen, 'en', 'es'])];
}
