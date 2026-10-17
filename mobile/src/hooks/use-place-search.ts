import { useEffect, useState } from 'react';

import type { LanguageCode } from '@/lib/languages';
import { searchPlaces, type PlaceSearchResult } from '@/lib/place-search';

// Wait for a pause in typing before searching.
const SEARCH_DELAY_MS = 350;

/** Searches Wikipedia for places matching what's been typed, once typing pauses. */
export function usePlaceSearch(query: string, language: LanguageCode) {
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setSearching(false);
      setError(undefined);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(text, language)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setError(undefined);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't search right now. Check your connection and try again.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, language]);

  const trimmed = query.trim();
  const noMatches = !searching && !error && trimmed.length >= 2 && results.length === 0;
  return { results, searching, error, noMatches };
}
