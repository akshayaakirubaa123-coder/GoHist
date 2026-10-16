import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildVisitedMapHtml,
  type VisitedCountry,
  type VisitedMapEvent,
  type VisitedMapState,
} from '@/lib/visited-map-html';

export type VisitedMapProps = {
  state: VisitedMapState;
  onCountries: (countries: VisitedCountry[]) => void;
};

/** Your visited-places map on phones, shown in a WebView like the nearby-history map. */
export function VisitedMap({ state, onCountries }: VisitedMapProps) {
  const dark = useColorScheme() === 'dark';
  const html = useMemo(() => buildVisitedMapHtml({ dark }), [dark]);
  const webView = useRef<WebView>(null);
  const ready = useRef(false);

  const push = (next: VisitedMapState) => {
    webView.current?.injectJavaScript(`window.gohistUpdate(${JSON.stringify(next)}); true;`);
  };

  useEffect(() => {
    if (ready.current) push(state);
  }, [state]);

  const onMessage = (event: WebViewMessageEvent) => {
    const message: VisitedMapEvent = JSON.parse(event.nativeEvent.data);
    if (message.type === 'ready') {
      ready.current = true;
      push(state);
    } else if (message.type === 'countries') {
      onCountries(message.countries);
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
