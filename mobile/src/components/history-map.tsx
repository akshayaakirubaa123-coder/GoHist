import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildMapHtml, type MapEvent, type MapState } from '@/lib/map-html';

export type HistoryMapProps = {
  state: MapState;
  onSelect: (id: string | undefined) => void;
};

/** The map on phones: the shared map page, shown in a WebView (a small built-in browser). */
export function HistoryMap({ state, onSelect }: HistoryMapProps) {
  const dark = useColorScheme() === 'dark';
  const html = useMemo(() => buildMapHtml({ dark }), [dark]);
  const webView = useRef<WebView>(null);
  const ready = useRef(false);

  const push = (next: MapState) => {
    webView.current?.injectJavaScript(`window.gohistUpdate(${JSON.stringify(next)}); true;`);
  };

  // Send the latest places to the map every time they change.
  useEffect(() => {
    if (ready.current) push(state);
  }, [state]);

  const onMessage = (event: WebViewMessageEvent) => {
    const message: MapEvent = JSON.parse(event.nativeEvent.data);
    if (message.type === 'ready') {
      ready.current = true;
      push(state);
    } else if (message.type === 'select') {
      onSelect(message.id);
    } else {
      onSelect(undefined);
    }
  };

  return (
    <WebView
      ref={webView}
      source={{ html, baseUrl: 'https://gohist.local/' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      onLoadStart={() => {
        ready.current = false;
      }}
      style={styles.map}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
