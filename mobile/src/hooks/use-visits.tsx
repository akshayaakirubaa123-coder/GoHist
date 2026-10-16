import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Place } from '@/lib/places';
import { mergeVisits } from '@/lib/visit-sync';
import { addVisits, sortVisits, type Visit } from '@/lib/visits';

const STORAGE_KEY = 'gohist.visits';

type VisitsContextValue = {
  /** Newest first. */
  visits: Visit[];
  hasVisited: (id: string) => boolean;
  markVisited: (places: Place[]) => void;
  /** Adds a place you've been to before, picked by hand. Does nothing if it's already logged. */
  addVisit: (visit: Visit) => void;
  removeVisit: (id: string) => void;
  /** Adds visits saved to your account (from another phone, say). */
  mergeIn: (visits: Visit[]) => void;
  /** False until the log on this phone has been read. */
  loaded: boolean;
};

const VisitsContext = createContext<VisitsContextValue>({
  visits: [],
  hasVisited: () => false,
  markVisited: () => {},
  addVisit: () => {},
  removeVisit: () => {},
  mergeIn: () => {},
  loaded: false,
});

/** The visit log ("history passport"). It's kept on this phone, and copied to your account when you're signed in. */
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
      addVisit: (visit) => {
        if (!loaded) return;
        save((current) => (current.some((v) => v.id === visit.id) ? current : sortVisits([visit, ...current])));
      },
      removeVisit: (id) => save((current) => current.filter((visit) => visit.id !== id)),
      mergeIn: (remote) => {
        if (!loaded) return;
        save((current) => {
          const merged = mergeVisits(current, remote);
          return merged === current ? current : sortVisits(merged);
        });
      },
      loaded,
    };
  }, [visits, loaded, save]);

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
}

export function useVisits() {
  return useContext(VisitsContext);
}
