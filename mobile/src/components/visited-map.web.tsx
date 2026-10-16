import { useEffect, useMemo, useRef } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildVisitedMapHtml, type VisitedMapEvent } from '@/lib/visited-map-html';

import type { VisitedMapProps } from './visited-map';

/** Your visited-places map on the web, shown in an iframe like the nearby-history map. */
export function VisitedMap({ state, onCountries }: VisitedMapProps) {
  const dark = useColorScheme() === 'dark';
  const html = useMemo(() => buildVisitedMapHtml({ dark }), [dark]);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const latest = useRef(state);
  latest.current = state;
  const onCountriesRef = useRef(onCountries);
  onCountriesRef.current = onCountries;

  const push = () => {
    frame.current?.contentWindow?.postMessage({ source: 'gohist-app', state: latest.current }, '*');
  };

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as VisitedMapEvent & { source?: string };
      if (message?.source !== 'gohist-visited-map') return;
      if (message.type === 'ready') {
        ready.current = true;
        push();
      } else if (message.type === 'countries') {
        onCountriesRef.current(message.countries);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    if (ready.current) push();
  }, [state]);

  return (
    <iframe
      ref={frame}
      title="Map of the places you've visited"
      srcDoc={html}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
    />
  );
}
