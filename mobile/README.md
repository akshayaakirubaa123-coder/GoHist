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
5. Allow location access when asked. You'll see Wikipedia-documented places near you, nearest first.

## On-device translation needs a development build

When a place has no article in your chosen language, the app translates it on the phone with Google ML Kit. Expo Go doesn't include that code, so in Expo Go those places stay in their original language (everything else works). To get translation, build your own copy of the app, called a development build, with EAS:

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

Install the build it gives you, then run `npx expo start` as above and open the project in that app instead of Expo Go.

## Checks

```bash
npm test           # unit tests for distance and place-merging logic
npm run typecheck  # TypeScript type check
npm run lint       # code style
```

## Where things live

- `src/app/` – screens (each file is a screen, thanks to Expo Router)
- `src/components/` – reusable UI pieces such as the place card
- `src/lib/` – logic with no UI: distance maths, Wikipedia lookups, merging results from several languages, choosing the display language
