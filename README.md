# GoHist

A mobile app for history-loving travellers. It uses your location to show nearby historical sites and events, and every fact links to a trustworthy, verified source (official heritage registers, Wikipedia, Wikidata).

## Status

Early development. The mobile app in [`mobile/`](mobile/) finds Wikipedia-documented places near you in English and Spanish. See [docs/plan.md](docs/plan.md) for the sources, tech stack and first-version scope, and [mobile/README.md](mobile/README.md) to run the app.

## Planned stack

- Mobile app: React Native with Expo (iOS and Android from one codebase)
- Backend: small API with a location-aware database (PostGIS) that caches lookups
