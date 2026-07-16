// Merge + dedupe campsites from multiple sources. Two records within
// ~300m whose names roughly match are treated as the same campground;
// the record from the higher-priority source wins, with gaps filled in
// from the other.

import { haversineMiles } from "../app/lib/geo";
import type { Campsite, DataSource } from "../app/lib/types";

const SOURCE_PRIORITY: DataSource[] = [
  "ridb",
  "hipcamp",
  "campendium",
  "seed",
  "osm",
];

const MATCH_RADIUS_MILES = 0.2;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(campground|campsite|camp|cg)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function sameSite(a: Campsite, b: Campsite): boolean {
  if (haversineMiles(a.lat, a.lon, b.lat, b.lon) > MATCH_RADIUS_MILES)
    return false;
  const nameA = normalizeName(a.name);
  const nameB = normalizeName(b.name);
  return nameA.includes(nameB) || nameB.includes(nameA);
}

/** Fill undefined/empty fields of `primary` from `secondary`. */
function merge(primary: Campsite, secondary: Campsite): Campsite {
  const merged: Campsite = { ...primary };
  for (const key of Object.keys(secondary) as (keyof Campsite)[]) {
    const value = merged[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      // @ts-expect-error keyed copy across a union of field types
      merged[key] = secondary[key];
    }
  }
  if (!merged.hookups.electricAmps.length && secondary.hookups.electricAmps.length) {
    merged.hookups = { ...secondary.hookups };
  }
  return merged;
}

export function dedupe(campsites: Campsite[]): Campsite[] {
  const ranked = [...campsites].sort(
    (a, b) =>
      SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source)
  );

  // Bucket by coarse lat/lon cell so matching is O(n) instead of O(n^2).
  const cell = (lat: number, lon: number) =>
    `${Math.round(lat * 50)}:${Math.round(lon * 50)}`;
  const buckets = new Map<string, Campsite[]>();
  const out: Campsite[] = [];

  for (const site of ranked) {
    const lat = Math.round(site.lat * 50);
    const lon = Math.round(site.lon * 50);
    let match: Campsite | undefined;
    outer: for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        for (const candidate of buckets.get(`${lat + dLat}:${lon + dLon}`) ??
          []) {
          if (sameSite(candidate, site)) {
            match = candidate;
            break outer;
          }
        }
      }
    }
    if (match) {
      const idx = out.indexOf(match);
      out[idx] = merge(match, site);
    } else {
      out.push(site);
      const key = cell(site.lat, site.lon);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(site);
      else buckets.set(key, [site]);
    }
  }
  return out;
}
