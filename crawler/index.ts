// Data pipeline orchestrator. Run locally or from the scheduled GitHub
// Actions workflow:
//
//   RIDB_API_KEY=... npm run crawl                # all sources
//   npm run crawl -- --sources=osm                # subset
//
// Writes the merged, deduped dataset to public/data/campsites.json, which
// the static webapp loads at runtime.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Campsite, CampsiteDataset, DataSource } from "../app/lib/types";
import { dedupe } from "./normalize";
import { crawlRidb } from "./sources/ridb";
import { crawlOverpass } from "./sources/overpass";
import { CAMPENDIUM, HIPCAMP, crawlWebTarget } from "./sources/webcrawl";

const OUTPUT = path.join(process.cwd(), "public", "data", "campsites.json");

function requestedSources(): Set<string> {
  const arg = process.argv.find((a) => a.startsWith("--sources="));
  if (!arg) return new Set(["ridb", "osm", "hipcamp", "campendium"]);
  return new Set(arg.split("=")[1].split(","));
}

async function main() {
  const sources = requestedSources();
  const collected: Campsite[] = [];

  // Keep hand-curated seed entries so the app always has data.
  try {
    const existing = JSON.parse(
      await readFile(OUTPUT, "utf-8")
    ) as CampsiteDataset;
    collected.push(...existing.campsites.filter((c) => c.source === "seed"));
  } catch {
    // No existing dataset yet.
  }

  if (sources.has("ridb")) {
    const apiKey = process.env.RIDB_API_KEY;
    if (apiKey) {
      const maxPages = Number(process.env.RIDB_MAX_PAGES ?? 40);
      collected.push(...(await crawlRidb(apiKey, maxPages)));
    } else {
      console.warn("[ridb] RIDB_API_KEY not set — skipping Recreation.gov");
    }
  }

  if (sources.has("osm")) {
    collected.push(...(await crawlOverpass()));
  }

  if (sources.has("hipcamp")) {
    collected.push(...(await crawlWebTarget(HIPCAMP)));
  }

  if (sources.has("campendium")) {
    collected.push(...(await crawlWebTarget(CAMPENDIUM)));
  }

  const campsites = dedupe(collected);
  const counts: Partial<Record<DataSource, number>> = {};
  for (const site of campsites) {
    counts[site.source] = (counts[site.source] ?? 0) + 1;
  }

  const dataset: CampsiteDataset = {
    generatedAt: new Date().toISOString(),
    sources: counts,
    campsites,
  };
  await writeFile(OUTPUT, JSON.stringify(dataset, null, 1));
  console.log(
    `Wrote ${campsites.length} campsites to ${OUTPUT}`,
    JSON.stringify(counts)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
