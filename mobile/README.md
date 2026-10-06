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

## Checks

```bash
npm test           # unit tests for distance and place-merging logic
npm run typecheck  # TypeScript type check
npm run lint       # code style
```

## Where things live

- `src/app/` – screens (each file is a screen, thanks to Expo Router)
- `src/components/` – reusable UI pieces such as the place card
- `src/lib/` – logic with no UI: distance maths, Wikipedia lookups, merging English and Spanish results
