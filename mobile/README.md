# GoHist mobile app

The iOS and Android app, built with [Expo](https://expo.dev) (React Native).

## Run it on your phone

1. Install [Node.js](https://nodejs.org) (version 20 or newer).
2. Install the **Expo Go** app on your phone from the App Store or Google Play.
3. In this folder, run:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code that appears with your phone's camera (iPhone) or the Expo Go app (Android).
5. Allow location access when asked. You'll see a map centred on you (the blue dot) with a red pin for each Wikipedia-documented place nearby. Tap a pin to read about it, or switch to **List** to see them nearest first.

Each place card also has:

- **Then and now**: old photos of that spot (from 1960 or earlier) next to a recent one, from Wikimedia Commons, each with its author, licence and a link.
- **I've been here**: adds the place to your **Passport** (top right), a log of the historic places you've visited. Places within 100 m of you are added automatically when the app loads. The log stays on your phone.

Tap **Offline** (top right) to download a city before a trip. GoHist saves the places, summaries and photos within about 7 km of the city centre, and shows them in the list when you have no signal. The map and old photos still need internet.

To try it in a web browser instead, run `npx expo start --web`.

The map is a small web page (`src/lib/map-html.ts`) drawn with [Leaflet](https://leafletjs.com). Phones show it in a WebView and the web version shows it in an iframe, so the map looks and works the same everywhere. Map pictures come from free services that need no API key: OpenStreetMap (street map) and Esri (satellite).

## On-device translation needs a development build

When a place has no article in your chosen language, the app translates it on the phone with Google ML Kit. Expo Go doesn't include that code, so in Expo Go those places stay in their original language (everything else works). To get translation, build your own copy of the app, called a development build, with EAS:

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

Install the build it gives you, then run `npx expo start` as above and open the project in that app instead of Expo Go.

## Checks

```bash
npm test           # unit tests for distance, place-merging, map-page, photo-dating, visit-log and download logic
npm run typecheck  # TypeScript type check
npm run lint       # code style
```

## Where things live

- `src/app/` – screens (each file is a screen, thanks to Expo Router)
- `src/components/` – reusable UI pieces such as the place card and the map
- `src/lib/` – logic with no UI: distance maths, Wikipedia lookups, merging results from several languages, choosing the display language
