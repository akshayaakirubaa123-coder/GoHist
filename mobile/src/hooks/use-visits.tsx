import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Place } from '@/lib/places';
import { addVisits, sortVisits, type Visit } from '@/lib/visits';

const STORAGE_KEY = 'gohist.visits';

type VisitsContextValue = {
  /** Newest first. */
  visits: Visit[];
  hasVisited: (id: string) => boolean;
  markVisited: (places: Place[]) => void;
  removeVisit: (id: string) => void;
};

const VisitsContext = createContext<VisitsContextValue>({
  visits: [],
  hasVisited: () => false,
  markVisited: () => {},
  removeVisit: () => {},
});

/** The visit log ("history passport"). It's kept only on this phone. */
export function VisitsProvider({ children }: { children: ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setVisits(sortVisits(JSON.parse(saved)));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback(
    (update: (current: Visit[]) => Visit[]) => {
      setVisits((current) => {
        const next = update(current);
        // Don't overwrite the saved log before it has been read.
        if (next !== current && loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [loaded],
  );

  const value = useMemo<VisitsContextValue>(() => {
    const ids = new Set(visits.map((visit) => visit.id));
    return {
      visits,
      hasVisited: (id) => ids.has(id),
      markVisited: (places) => {
        if (loaded) save((current) => sortVisits(addVisits(current, places, new Date())));
      },
      removeVisit: (id) => save((current) => current.filter((visit) => visit.id !== id)),
    };
  }, [visits, loaded, save]);

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
}

export function useVisits() {
  return useContext(VisitsContext);
}
