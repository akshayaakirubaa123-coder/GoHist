import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { SavedArea } from '@/lib/offline';

// Each area is stored under its own key, since one key holding several cities
// could pass Android's 2 MB limit for a single stored value.
const INDEX_KEY = 'gohist.savedAreas';
const areaKey = (id: string) => `gohist.savedArea.${id}`;

type SavedAreasContextValue = {
  areas: SavedArea[];
  /** Saves an area (replacing an older copy of it) and stores its photos on the phone. */
  saveArea: (area: SavedArea) => Promise<void>;
  removeArea: (id: string) => void;
};

const SavedAreasContext = createContext<SavedAreasContextValue>({
  areas: [],
  saveArea: async () => {},
  removeArea: () => {},
});

/** Cities and areas downloaded for use without internet. */
export function SavedAreasProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<SavedArea[]>([]);

  useEffect(() => {
    (async () => {
      const ids: string[] = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) ?? '[]');
      const stored = await AsyncStorage.multiGet(ids.map(areaKey));
      setAreas(stored.flatMap(([, json]) => (json ? [JSON.parse(json) as SavedArea] : [])));
    })().catch(() => {});
  }, []);

  const saveArea = useCallback(async (area: SavedArea) => {
    setAreas((current) => {
      const next = [area, ...current.filter((existing) => existing.id !== area.id)];
      AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next.map((saved) => saved.id))).catch(() => {});
      return next;
    });
    await AsyncStorage.setItem(areaKey(area.id), JSON.stringify(area)).catch(() => {});
    const photos = area.places.flatMap((place) => (place.thumbnailUrl ? [place.thumbnailUrl] : []));
    // Keep the place photos on disk so cards still show them offline.
    if (photos.length > 0) await Image.prefetch(photos, 'disk').catch(() => false);
  }, []);

  const removeArea = useCallback((id: string) => {
    setAreas((current) => {
      const next = current.filter((area) => area.id !== id);
      AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next.map((saved) => saved.id))).catch(() => {});
      return next;
    });
    AsyncStorage.removeItem(areaKey(id)).catch(() => {});
  }, []);

  const value = useMemo(() => ({ areas, saveArea, removeArea }), [areas, saveArea, removeArea]);
  return <SavedAreasContext.Provider value={value}>{children}</SavedAreasContext.Provider>;
}

export function useSavedAreas() {
  return useContext(SavedAreasContext);
}
