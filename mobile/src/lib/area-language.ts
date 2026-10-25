import * as Location from 'expo-location';

import type { Coordinates } from './geo.ts';
import { localLanguage, type LanguageCode } from './languages.ts';

// Answers for areas already looked up, keyed to about 10 km, so moving around a city doesn't ask again.
const cache = new Map<string, LanguageCode | undefined>();

// Don't hold up the search for long if the phone is slow to say where it is.
const TIMEOUT_MS = 3000;

/**
 * The local language of the area around `coordinates` (French in France,
 * Japanese in Japan, Tamil in Tamil Nadu), found from the country and region
 * the phone's own geocoder reports. Undefined if it can't tell, or the local
 * language is English.
 */
export async function areaLanguage(coordinates: Coordinates): Promise<LanguageCode | undefined> {
  const key = `${coordinates.latitude.toFixed(1)},${coordinates.longitude.toFixed(1)}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const addresses = await Promise.race([
      Location.reverseGeocodeAsync(coordinates),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS)),
    ]);
    const address = addresses[0];
    const language = localLanguage(address?.isoCountryCode, address?.region);
    if (address) cache.set(key, language);
    return language;
  } catch {
    // No geocoder (e.g. on the web) or no answer: search without a local language.
    return undefined;
  }
}
