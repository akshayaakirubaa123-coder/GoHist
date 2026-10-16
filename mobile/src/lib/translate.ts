import TranslateText, { type TranslateLanguage } from '@react-native-ml-kit/translate-text';
import { NativeModules } from 'react-native';

import type { LanguageCode } from './languages.ts';

// Translations already made this session, so scrolling or refreshing doesn't redo them.
const cache = new Map<string, string>();

/**
 * Whether this build of the app can translate on the phone. It can't in Expo
 * Go or on the web, which don't include the translation code; places then
 * stay in their original language.
 */
export const canTranslateOnDevice = Boolean(NativeModules.TranslateText);

/**
 * Translates `text` on the phone with Google ML Kit. Nothing is sent to a
 * server; the first time a language is used, the phone downloads its
 * translation model (about 30 MB). Returns undefined if translation isn't possible.
 */
export async function translateOnDevice(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
): Promise<string | undefined> {
  if (!canTranslateOnDevice || from === to) return undefined;
  const key = `${from}>${to}:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const result = await TranslateText.translate({
      text,
      sourceLanguage: from as TranslateLanguage,
      targetLanguage: to as TranslateLanguage,
      downloadModelIfNeeded: true,
    });
    if (typeof result !== 'string' || !result) return undefined;
    cache.set(key, result);
    return result;
  } catch {
    // The language isn't supported, or the model couldn't download (e.g. offline).
    return undefined;
  }
}
