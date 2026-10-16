import { useEffect, useMemo, useRef } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildMapHtml, type MapEvent, type MapState } from '@/lib/map-html';

import type { HistoryMapProps } from './history-map';

/** The map on the web: the shared map page, shown in an iframe (a page inside the page). */
export function HistoryMap({ state, onSelect }: HistoryMapProps) {
  const dark = useColorScheme() === 'dark';
  const html = useMemo(() => buildMapHtml({ dark }), [dark]);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const latest = useRef(state);
  latest.current = state;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const push = () => {
    frame.current?.contentWindow?.postMessage({ source: 'gohist-app', state: latest.current }, '*');
  };

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as MapEvent & { source?: string };
      if (message?.source !== 'gohist-map') return;
      if (message.type === 'ready') {
        ready.current = true;
        push();
      } else if (message.type === 'select') {
        onSelectRef.current(message.id);
      } else {
        onSelectRef.current(undefined);
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
      title="Map of nearby historic places"
      srcDoc={html}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
    />
  );
}
