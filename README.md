# ⛺ CampCrawler

Campsite finder. Search campgrounds across public lands and private camps by
destination, travel dates, camping style (tent / RV / trailer / van / cabin /
glamping / dispersed / backcountry), rig size, hookups (30/50-amp electric,
water, sewer), party size, pets, accessibility, must-have amenities, desired
activities, price, and reservation type. Results are scored, ranked, mapped,
and deep-linked to availability for your dates.

Live app: https://feartheotters.github.io/CampCrawler/

## Architecture

Same stack as my other webapps: **Next.js (App Router) + React + TypeScript
(strict) + Tailwind CSS 4**, statically exported (`output: "export"`) and
deployed to **GitHub Pages**.

Because the site is fully static, data collection runs in CI rather than on a
server:

```
┌────────────────────────────  GitHub Actions  ───────────────────────────┐
│  crawl.yml (weekly cron + manual)                                       │
│    crawler/index.ts                                                     │
│      ├─ sources/ridb.ts      Recreation.gov RIDB API (NPS/USFS/BLM)     │
│      ├─ sources/overpass.ts  OpenStreetMap camp_site features           │
│      ├─ sources/webcrawl.ts  Hipcamp/Campendium adapters (robots.txt-   │
│      │                       respecting; skip when crawling disallowed) │
│      └─ normalize.ts         merge + geo/name dedupe across sources     │
│    → commits public/data/campsites.json to main                         │
│                                                                         │
│  deploy.yml (push to main)   next build → deploy out/ to GitHub Pages   │
│  ci.yml (PRs + branches)     typecheck → vitest → build                 │
└─────────────────────────────────────────────────────────────────────────┘

Browser (static app)
  ├─ loads public/data/campsites.json
  ├─ geocodes your destination via OSM Nominatim
  ├─ filters + scores candidates client-side (app/lib/filter.ts)
  └─ maps results with Leaflet; "Check availability" deep-links your dates
     into recreation.gov / operator booking pages
```

## Development

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm test           # vitest (filter/ranking engine)
npm run build      # static export to out/
```

## Data pipeline

```bash
RIDB_API_KEY=... npm run crawl              # all sources
npm run crawl -- --sources=osm              # subset
```

- **RIDB**: get a free API key at https://ridb.recreation.gov and add it as
  the `RIDB_API_KEY` repository secret so the scheduled workflow can use it.
  Without the key the RIDB source is skipped.
- **OpenStreetMap**: no key needed. Coverage bboxes are configurable via
  `OVERPASS_BBOXES` (JSON `[[south, west, north, east], ...]`).
- **Hipcamp / Campendium**: adapters check each site's `robots.txt` before
  fetching anything and skip pages that disallow crawling (both currently
  do), logging what was skipped. Seed entries and API/dataset sources keep
  the index useful regardless.
- A hand-curated seed dataset ships in `public/data/campsites.json` so the
  app works before the first crawl completes.

## Repo setup checklist

1. GitHub Pages: Settings → Pages → Source: **GitHub Actions**.
2. Add the `RIDB_API_KEY` secret (optional but recommended).
3. Trigger **Refresh campsite data** from the Actions tab for the first full
   dataset, or wait for the Monday cron.
