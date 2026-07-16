// OpenStreetMap Overpass adapter — pulls tourism=camp_site features,
// including many free/dispersed sites no booking API knows about.

import type { Amenity, Campsite, CampingType } from "../../app/lib/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Default coverage: continental US, split into quadrants to keep each
// Overpass request within server limits. Override with OVERPASS_BBOXES
// (JSON array of [south, west, north, east]).
const DEFAULT_BBOXES: [number, number, number, number][] = [
  [24.5, -125.0, 37.0, -96.0], // southwest
  [37.0, -125.0, 49.0, -96.0], // northwest
  [24.5, -96.0, 37.0, -66.9], // southeast
  [37.0, -96.0, 49.0, -66.9], // northeast
];

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function mapTags(tags: Record<string, string>): {
  campingTypes: CampingType[];
  amenities: Amenity[];
  free: boolean | undefined;
} {
  const types = new Set<CampingType>();
  if (tags.tents !== "no") types.add("tent");
  if (tags.caravans === "yes" || tags.motorhome === "yes") {
    types.add("rv");
    types.add("trailer");
  }
  if (tags.cabins === "yes" || tags.bungalows === "yes") types.add("cabin");
  if (tags.backcountry === "yes") types.add("backcountry");
  if (tags.group_only === "yes") types.add("group");
  if (tags.informal === "yes") types.add("dispersed");
  if (!types.size) types.add("tent");

  const amenities = new Set<Amenity>();
  if (tags.drinking_water === "yes") amenities.add("drinking_water");
  if (tags.toilets === "yes") amenities.add("vault_toilets");
  if (tags.shower === "yes" || tags["shower:fee"]) amenities.add("showers");
  if (tags.picnic_table === "yes") amenities.add("picnic_tables");
  if (tags.firepit === "yes" || tags.openfire === "yes")
    amenities.add("fire_rings");
  if (tags.waste_disposal === "yes") amenities.add("trash");
  if (tags["sanitary_dump_station"] === "yes") amenities.add("dump_station");
  if (tags.shop === "yes") amenities.add("camp_store");
  if (tags.internet_access && tags.internet_access !== "no")
    amenities.add("wifi");
  if (tags.playground === "yes") amenities.add("playground");

  const free =
    tags.fee === "no" ? true : tags.fee === "yes" ? false : undefined;
  return { campingTypes: [...types], amenities: [...amenities], free };
}

async function queryBbox(
  bbox: [number, number, number, number]
): Promise<OverpassElement[]> {
  const query = `
    [out:json][timeout:120];
    nwr["tourism"="camp_site"](${bbox.join(",")});
    out center tags;
  `;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) {
    console.error(`[osm] Overpass HTTP ${res.status} for bbox ${bbox}`);
    return [];
  }
  const body = (await res.json()) as { elements: OverpassElement[] };
  return body.elements ?? [];
}

export async function crawlOverpass(): Promise<Campsite[]> {
  const bboxes: [number, number, number, number][] = process.env
    .OVERPASS_BBOXES
    ? JSON.parse(process.env.OVERPASS_BBOXES)
    : DEFAULT_BBOXES;

  const campsites: Campsite[] = [];
  for (const bbox of bboxes) {
    const elements = await queryBbox(bbox);
    for (const el of elements) {
      const tags = el.tags ?? {};
      const name = tags.name;
      if (!name) continue; // unnamed sites are rarely actionable
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat === undefined || lon === undefined) continue;
      const { campingTypes, amenities, free } = mapTags(tags);
      campsites.push({
        id: `osm-${el.type}-${el.id}`,
        source: "osm",
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        name,
        description: tags.description,
        lat,
        lon,
        agency: tags.operator,
        campingTypes,
        hookups: {
          electricAmps: tags.power_supply === "yes" ? [30] : [],
          water: tags.water_supply === "yes",
          sewer: tags["sanitary_dump_station"] === "yes",
        },
        petsAllowed:
          tags.dog === "yes" ? true : tags.dog === "no" ? false : undefined,
        accessible: tags.wheelchair === "yes" ? true : undefined,
        amenities,
        activities: [],
        priceMin: free === true ? 0 : undefined,
        reservation:
          tags.reservation === "required" || tags.reservation === "yes"
            ? "reservable"
            : tags.reservation === "no"
              ? "fcfs"
              : "unknown",
        reservationUrl: tags.website,
        totalSites: tags.capacity ? parseInt(tags.capacity, 10) : undefined,
      });
    }
    console.log(`[osm] bbox ${bbox}: ${campsites.length} named sites so far`);
  }
  return campsites;
}
