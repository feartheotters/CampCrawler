import type { SearchLocation } from "./types";

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

/** Geocode a free-text place name via OpenStreetMap Nominatim. */
export async function geocode(query: string): Promise<SearchLocation | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const results = (await res.json()) as NominatimResult[];
  if (!results.length) return null;
  const top = results[0];
  return {
    label: top.display_name.split(",").slice(0, 3).join(","),
    lat: parseFloat(top.lat),
    lon: parseFloat(top.lon),
  };
}
