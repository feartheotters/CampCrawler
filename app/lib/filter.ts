// Pure filtering + ranking engine. Hard constraints exclude a site;
// soft preferences contribute to a 0-100 relevance score.

import { haversineMiles } from "./geo";
import type {
  Campsite,
  ScoredCampsite,
  SearchParams,
  Season,
} from "./types";

/** Month-day ("MM-DD") as a comparable number, e.g. "05-15" -> 515. */
function monthDay(md: string): number {
  const [m, d] = md.split("-").map(Number);
  return m * 100 + d;
}

/** True when every day of [startDate, endDate] falls inside the season. */
export function seasonCoversTrip(
  season: Season | "year-round" | undefined,
  startDate: string,
  endDate: string
): boolean {
  if (!season || season === "year-round") return true;
  const open = monthDay(season.open);
  const close = monthDay(season.close);
  const start = monthDay(startDate.slice(5));
  const end = monthDay(endDate.slice(5));
  if (open <= close) {
    // Season within one calendar year, e.g. 05-15 .. 10-01.
    return start >= open && end <= close && start <= end;
  }
  // Season wraps the new year, e.g. 10-01 .. 04-30.
  const inWindow = (md: number) => md >= open || md <= close;
  return inWindow(start) && inWindow(end);
}

/** Hard constraints: returns null if excluded, else distance in miles. */
function passesHardFilters(
  site: Campsite,
  params: SearchParams
): number | null {
  if (!params.location) return null;
  const distance = haversineMiles(
    params.location.lat,
    params.location.lon,
    site.lat,
    site.lon
  );
  if (distance > params.radiusMiles) return null;

  if (
    params.campingTypes.length &&
    !params.campingTypes.some((t) => site.campingTypes.includes(t))
  ) {
    return null;
  }

  const rvTrip = params.campingTypes.some((t) =>
    ["rv", "trailer", "van"].includes(t)
  );
  if (rvTrip && params.rigLengthFt !== undefined) {
    // Unknown rig limits pass; known-too-short limits exclude.
    if (site.maxRigLength !== undefined && site.maxRigLength < params.rigLengthFt) {
      return null;
    }
  }

  if (params.needsElectric) {
    if (!site.hookups.electricAmps.length) return null;
    if (
      params.minAmps !== undefined &&
      !site.hookups.electricAmps.some((a) => a >= params.minAmps!)
    ) {
      return null;
    }
  }
  if (params.needsWater && !site.hookups.water) return null;
  if (params.needsSewer && !site.hookups.sewer) return null;
  if (params.needsPullThrough && site.pullThrough === false) return null;

  if (
    site.maxPeople !== undefined &&
    params.partySize > site.maxPeople &&
    !site.campingTypes.includes("group")
  ) {
    return null;
  }

  if (params.petsRequired && site.petsAllowed === false) return null;
  if (params.accessibleRequired && site.accessible === false) return null;

  for (const amenity of params.requiredAmenities) {
    if (!site.amenities.includes(amenity)) return null;
  }

  if (params.freeOnly) {
    if (site.priceMin === undefined || site.priceMin > 0) return null;
  } else if (
    params.maxPricePerNight !== undefined &&
    site.priceMin !== undefined &&
    site.priceMin > params.maxPricePerNight
  ) {
    return null;
  }

  if (params.reservationMode === "reservable") {
    if (site.reservation === "fcfs") return null;
  } else if (params.reservationMode === "fcfs") {
    if (site.reservation === "reservable") return null;
  }

  if (!seasonCoversTrip(site.season, params.startDate, params.endDate)) {
    return null;
  }

  return distance;
}

function scoreSite(
  site: Campsite,
  params: SearchParams,
  distanceMiles: number
): { score: number; highlights: string[] } {
  const highlights: string[] = [];
  let score = 0;

  // Proximity: up to 35 points, linear falloff across the search radius.
  const proximity = 1 - distanceMiles / Math.max(params.radiusMiles, 1);
  score += 35 * Math.max(0, proximity);
  if (distanceMiles <= params.radiusMiles * 0.25) {
    highlights.push(`Only ${Math.round(distanceMiles)} mi away`);
  }

  // Community rating: up to 25 points, weighted by review volume.
  if (site.rating !== undefined) {
    const confidence = Math.min(1, (site.reviewCount ?? 0) / 50);
    score += 25 * (site.rating / 5) * (0.5 + 0.5 * confidence);
    if (site.rating >= 4.5) highlights.push(`Rated ${site.rating.toFixed(1)}★`);
  } else {
    score += 10; // neutral prior for unrated sites
  }

  // Desired activities: up to 20 points.
  if (params.desiredActivities.length) {
    const matched = params.desiredActivities.filter((a) =>
      site.activities.includes(a)
    );
    score += 20 * (matched.length / params.desiredActivities.length);
    if (matched.length === params.desiredActivities.length) {
      highlights.push("Has all your activities");
    }
  } else {
    score += 10;
  }

  // Amenity richness beyond requirements: up to 10 points.
  score += Math.min(10, site.amenities.length);

  // Certainty bonuses: up to 10 points.
  if (site.reservationUrl) score += 4;
  if (site.priceMin !== undefined) score += 3;
  if (site.priceMin === 0) highlights.push("Free");
  if (site.season) score += 3;

  return { score: Math.round(Math.min(100, score)), highlights };
}

export function searchCampsites(
  campsites: Campsite[],
  params: SearchParams
): ScoredCampsite[] {
  const results: ScoredCampsite[] = [];
  for (const site of campsites) {
    const distance = passesHardFilters(site, params);
    if (distance === null) continue;
    const { score, highlights } = scoreSite(site, params, distance);
    results.push({
      campsite: site,
      distanceMiles: Math.round(distance * 10) / 10,
      score,
      highlights,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}
