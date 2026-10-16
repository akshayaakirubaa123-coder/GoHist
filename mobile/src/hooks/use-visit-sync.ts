import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useVisits } from '@/hooks/use-visits';
import { supabase } from '@/lib/supabase';
import { rowToVisit, visitToRow, type VisitRow } from '@/lib/visit-sync';

/**
 * Keeps your history passport in step with your account while you're signed
 * in: visits saved from other phones are added here, and visits logged or
 * removed here are saved to your account.
 */
export function useVisitSync() {
  const { session } = useAuth();
  const { visits, loaded, mergeIn } = useVisits();
  const userId = session?.user.id;
  // Place IDs saved in your account, once they've been fetched.
  const remoteIds = useRef<Set<string> | null>(null);
  const [pulledFor, setPulledFor] = useState<string | null>(null);
  const mergeInRef = useRef(mergeIn);
  mergeInRef.current = mergeIn;

  // When you sign in, fetch the visits saved to your account.
  useEffect(() => {
    remoteIds.current = null;
    setPulledFor(null);
    if (!supabase || !userId || !loaded) return;
    let cancelled = false;
    supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId)
      .returns<VisitRow[]>()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        remoteIds.current = new Set(data.map((row) => row.place_id));
        mergeInRef.current(data.map(rowToVisit));
        setPulledFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, loaded]);

  // Then save whatever changes on this phone.
  useEffect(() => {
    const known = remoteIds.current;
    if (!supabase || !userId || pulledFor !== userId || !known) return;
    const current = new Set(visits.map((visit) => visit.id));
    const added = visits.filter((visit) => !known.has(visit.id));
    const removed = [...known].filter((id) => !current.has(id));
    if (added.length > 0) {
      added.forEach((visit) => known.add(visit.id));
      supabase
        .from('visits')
        .upsert(added.map((visit) => visitToRow(visit, userId)))
        .then(({ error }) => {
          // Try again on the next change.
          if (error) added.forEach((visit) => known.delete(visit.id));
        });
    }
    if (removed.length > 0) {
      removed.forEach((id) => known.delete(id));
      supabase
        .from('visits')
        .delete()
        .eq('user_id', userId)
        .in('place_id', removed)
        .then(({ error }) => {
          if (error) removed.forEach((id) => known.add(id));
        });
    }
  }, [visits, userId, pulledFor]);
}
