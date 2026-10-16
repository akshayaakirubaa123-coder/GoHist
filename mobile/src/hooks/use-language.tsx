import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_LANGUAGE, LANGUAGES, type LanguageCode } from '@/lib/languages';

const STORAGE_KEY = 'gohist.language';

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

/** Holds the language place information is shown in, and remembers it between app launches. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && LANGUAGES.some((option) => option.code === saved)) setLanguageState(saved);
      })
      .catch(() => {
        // If the saved choice can't be read, English is a fine default.
      });
  }, []);

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
