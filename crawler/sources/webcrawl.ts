// Web-crawl adapters for camping sites without public APIs (Hipcamp,
// Campendium, ...). These strictly honor robots.txt: if a site disallows
// crawling of its listing pages (both currently do), the adapter reports
// that and returns nothing rather than fetching disallowed content.

import type { Campsite } from "../../app/lib/types";
import { isAllowed, politeDelay } from "../robots";

export interface CrawlTarget {
  source: "hipcamp" | "campendium";
  /** Listing index pages to crawl when robots.txt permits. */
  seedUrls: string[];
  /** Extract campsites from a fetched listing page. */
  parse: (html: string, url: string) => Campsite[];
}

export const HIPCAMP: CrawlTarget = {
  source: "hipcamp",
  seedUrls: ["https://www.hipcamp.com/en-US/discover"],
  parse: () => {
    // Listing markup is JS-rendered; parsing is only worth implementing if
    // robots.txt ever permits crawling. Until then this never runs.
    return [];
  },
};

export const CAMPENDIUM: CrawlTarget = {
  source: "campendium",
  seedUrls: ["https://www.campendium.com/camping/free-camping"],
  parse: () => [],
};

export async function crawlWebTarget(target: CrawlTarget): Promise<Campsite[]> {
  const campsites: Campsite[] = [];
  for (const url of target.seedUrls) {
    if (!(await isAllowed(url))) {
      console.warn(
        `[${target.source}] robots.txt disallows ${url} — skipping (no fetch made)`
      );
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CampCrawler/1.0 (personal camping planner)" },
      });
      if (!res.ok) {
        console.error(`[${target.source}] HTTP ${res.status} for ${url}`);
        continue;
      }
      campsites.push(...target.parse(await res.text(), url));
    } catch (err) {
      console.error(`[${target.source}] fetch failed for ${url}:`, err);
    }
    await politeDelay();
  }
  return campsites;
}
