# History Travel App: Sources, Stack and V1 Plan

_Prepared 2026-10-06 for akshayaa. Status: proposal, no code or repository created yet._

## 1. What "verified" means in this app

Every fact card shows **where it came from, with a link**, and the app only uses sources in these tiers:

| Tier | Meaning | Examples |
|---|---|---|
| **A: Official register** | A government or intergovernmental body has formally designated the place | UNESCO World Heritage, Historic England (NHLE), US National Register of Historic Places, national monument registers |
| **B: Cited encyclopedia** | Community-edited but with references, editorial review and revision history | Wikipedia articles, Wikidata statements that carry references |
| Not used in V1 | Unreferenced or generated text | AI-written summaries, user posts, blogs |

Cards are badged by tier (for example "Official heritage register" vs "Wikipedia"), so travellers can see how strong the source is. No AI-generated facts in V1; that keeps the "trustable" promise simple to defend.

## 2. Sources you can look up by location

| Source | What it gives | Location lookup | Licence | Limits / catches |
|---|---|---|---|---|
| **Wikipedia GeoSearch** (MediaWiki API `list=geosearch`) | Articles about places near a point, plus intro text and images | Radius 10 m to 10 km, up to 500 results per call | Text CC BY-SA 4.0 (attribution + share-alike on excerpts) | Since March 2026 Wikimedia applies low rate limits to anonymous and browser/app traffic; identified or authenticated clients get higher limits. Calls must send a descriptive User-Agent. |
| **Wikidata** (Query Service, SPARQL) | Structured facts: inception date (P571), heritage designation (P1435), UNESCO site ID (P757), battles and events with coordinates (P625) and dates (P585) | `wikibase:around` / `wikibase:box` geo queries | **CC0** (no restrictions) | 60 s per-query timeout and per-client throttling; not meant to be hit directly by every phone. |
| **UNESCO World Heritage List** | ~1,200 sites with coordinates, criteria, inscription year | XML, GeoRSS, KML, XLSX feeds from whc.unesco.org/en/syndication | **All rights reserved**: republishing needs prior written authorisation from UNESCO | Use Wikidata's P757 (CC0) to flag UNESCO sites and link out to whc.unesco.org instead of copying UNESCO's text. Ask UNESCO for permission later if we want their descriptions. |
| **Historic England NHLE** | ~400,000 listed buildings, monuments, battlefields in England | Open Data Hub downloads and APIs | Open Government Licence (free incl. commercial, with attribution) | England only. Good model for adding other national registers. |
| **US National Register of Historic Places** (NPS) | ~97,000 listed properties, National Historic Landmarks | GIS geodatabase and Excel downloads | US federal data, generally public domain | NPS notes some coordinates need correction; treat as a bulk import, not a live API. |
| **OpenStreetMap** `historic=*` tags | Memorials, ruins, castles, plaques, often things Wikipedia skips | Overpass API bbox queries | ODbL (attribution, share-alike on the database) | Community-tagged, so Tier B at best; useful later for map pins, not as the fact source. |

Other national registers (Singapore's National Heritage Board on data.gov.sg, France's Mérimée, etc.) can be added country by country later using the same import pattern.

### Key takeaway
**Wikidata + Wikipedia cover the whole world for free and are the backbone of V1.** Wikidata's heritage-designation and UNESCO-ID properties let us mark which places are officially recognised without copying restricted data. National registers are added as bulk imports to raise coverage and trust in specific countries.

## 3. Recommended tech stack

**Picked: React Native with Expo** (the default; nothing found argues against it).

| Layer | Choice | Why |
|---|---|---|
| App | Expo (React Native, TypeScript), Expo Router | One codebase for iOS and Android; fast to iterate with Expo Go and EAS Build |
| Location | `expo-location` + `expo-task-manager` | Foreground location for V1; background geofencing ("you're near a historic site") is supported later |
| Map | `react-native-maps` (Apple Maps / Google Maps) | Native, free tiers adequate for V1 |
| Notifications | `expo-notifications` | For nearby-site alerts in V2 |
| Backend | Small API on Supabase (Postgres + PostGIS) or Cloudflare Workers + D1 | Needed because of Wikimedia's 2026 rate limits: phones should call **our** API, which identifies itself to Wikimedia, caches results by map tile, and merges register data. PostGIS makes "what's within 2 km" queries cheap. |
| Data jobs | Scheduled import scripts | Pull NHLE, NRHP and Wikidata heritage sites into PostGIS on a schedule |

## 4. V1 scope (the first usable version)

**Goal:** open the app anywhere, see trustworthy history around you, read it, and tap through to the source.

1. **Nearby list and map**: on launch, ask for location permission, show sites within a chosen radius (500 m / 2 km / 10 km) as pins and a distance-sorted list.
2. **Fact card**: name, short summary (Wikipedia intro), key dates (built, events), heritage status badge (UNESCO / national register), photo, and a **"Source" link** with the licence credit.
3. **"On this spot" events**: battles, treaties and other dated events with coordinates from Wikidata, shown alongside places.
4. **Offline-friendly cache**: the last area viewed stays available without signal (travellers often lose data).
5. **Attribution screen**: lists every source and licence, as CC BY-SA, OGL and ODbL require.

**Not in V1:** background tracking and push alerts, accounts, saved trips, audio guides, AI summaries, user contributions. These are V2 candidates.

## 5. Build order

1. Backend: `/nearby?lat&lon&radius` endpoint that queries Wikipedia GeoSearch + Wikidata, caches per tile, and returns normalised cards with tier and source.
2. App skeleton in Expo: permission flow, map + list, fact card, source links.
3. Wikidata events layer and heritage badges (P1435, P757).
4. First register import (NHLE or NRHP) to prove the multi-source merge and de-duplication (match on Wikidata IDs where registers provide them).
5. Offline cache, attribution screen, internal test build via EAS on real phones while walking around a historic area.

## 6. Open questions for akshayaa

- Which country or city should V1 be tuned for first (this decides which national register to import first)?
- Is this free/personal, or will it be commercial? (UNESCO text and some registers have different terms for commercial use.)
- OK to create a GitHub repository and scaffold the Expo app plus backend next?

## Sources

- [MediaWiki GeoData extension (geosearch limits)](https://www.mediawiki.org/wiki/Extension:GeoData)
- [Wikimedia new global API rate limits announcement](https://www.mail-archive.com/wikitech-l@lists.wikimedia.org/msg97202.html)
- [Wikimedia APIs rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [UNESCO World Heritage syndication and terms](https://whc.unesco.org/en/syndication/)
- [Historic England Open Data Hub](https://historicengland.org.uk/listing/the-list/open-data-hub/)
- [NPS National Register data downloads](https://home.nps.gov/subjects/nationalregister/data-downloads.htm)
