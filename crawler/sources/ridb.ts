// Recreation.gov RIDB API adapter — covers NPS/USFS/BLM/USACE campgrounds.
// Requires a free API key (https://ridb.recreation.gov) in RIDB_API_KEY.

import type { Activity, Amenity, Campsite, CampingType } from "../../app/lib/types";

const API = "https://ridb.recreation.gov/api/v1";
const PAGE_SIZE = 50;

interface RidbFacility {
  FacilityID: string;
  FacilityName: string;
  FacilityDescription: string;
  FacilityTypeDescription: string;
  FacilityLatitude: number;
  FacilityLongitude: number;
  FacilityAdaAccess: string;
  Reservable: boolean;
  ACTIVITY?: { ActivityName: string }[];
  RECAREA?: { RecAreaName: string }[];
}

const ACTIVITY_MAP: Record<string, Activity> = {
  HIKING: "hiking",
  FISHING: "fishing",
  SWIMMING: "swimming",
  BOATING: "boating",
  PADDLING: "paddling",
  "ROCK CLIMBING": "climbing",
  BIKING: "biking",
  "WILDLIFE VIEWING": "wildlife",
  "HORSEBACK RIDING": "horseback",
  "OFF HIGHWAY VEHICLE": "off_roading",
};

function mapActivities(facility: RidbFacility): Activity[] {
  const out = new Set<Activity>();
  for (const a of facility.ACTIVITY ?? []) {
    const mapped = ACTIVITY_MAP[a.ActivityName?.toUpperCase() ?? ""];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

function inferTypes(description: string): CampingType[] {
  const text = description.toLowerCase();
  const types = new Set<CampingType>(["tent"]);
  if (/\brv\b|motorhome|hookup/.test(text)) types.add("rv");
  if (/trailer|fifth wheel/.test(text)) types.add("trailer");
  if (/cabin|yurt/.test(text)) types.add("cabin");
  if (/group site|group camp/.test(text)) types.add("group");
  return [...types];
}

function inferAmenities(description: string): Amenity[] {
  const text = description.toLowerCase();
  const out = new Set<Amenity>();
  if (/drinking water|potable water/.test(text)) out.add("drinking_water");
  if (/flush toilet/.test(text)) out.add("flush_toilets");
  if (/vault toilet|pit toilet/.test(text)) out.add("vault_toilets");
  if (/shower/.test(text)) out.add("showers");
  if (/picnic table/.test(text)) out.add("picnic_tables");
  if (/fire ring|fire pit|campfire/.test(text)) out.add("fire_rings");
  if (/dump station/.test(text)) out.add("dump_station");
  if (/camp store|general store/.test(text)) out.add("camp_store");
  if (/boat ramp|boat launch/.test(text)) out.add("boat_ramp");
  if (/lakefront|riverside|beachfront|waterfront|lakeside/.test(text))
    out.add("waterfront");
  return [...out];
}

export async function crawlRidb(apiKey: string, maxPages = 20): Promise<Campsite[]> {
  const campsites: Campsite[] = [];
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${API}/facilities`);
    url.searchParams.set("activity", "CAMPING");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(page * PAGE_SIZE));
    url.searchParams.set("full", "true");
    const res = await fetch(url.toString(), { headers: { apikey: apiKey } });
    if (!res.ok) {
      console.error(`[ridb] HTTP ${res.status} on page ${page}, stopping`);
      break;
    }
    const body = (await res.json()) as { RECDATA: RidbFacility[] };
    const facilities = body.RECDATA ?? [];
    if (!facilities.length) break;

    for (const f of facilities) {
      if (f.FacilityTypeDescription !== "Campground") continue;
      if (!f.FacilityLatitude || !f.FacilityLongitude) continue;
      const description = (f.FacilityDescription ?? "").replace(/<[^>]+>/g, " ");
      campsites.push({
        id: `ridb-${f.FacilityID}`,
        source: "ridb",
        sourceUrl: `https://www.recreation.gov/camping/campgrounds/${f.FacilityID}`,
        name: f.FacilityName,
        description: description.slice(0, 400).trim() || undefined,
        lat: f.FacilityLatitude,
        lon: f.FacilityLongitude,
        agency: f.RECAREA?.[0]?.RecAreaName,
        campingTypes: inferTypes(description),
        hookups: {
          electricAmps: /electric hookup|50.?amp|30.?amp/i.test(description)
            ? [30]
            : [],
          water: /water hookup/i.test(description),
          sewer: /sewer hookup|full hookup/i.test(description),
        },
        petsAllowed: /no pets|pets are not/i.test(description) ? false : undefined,
        accessible: f.FacilityAdaAccess === "Y" ? true : undefined,
        amenities: inferAmenities(description),
        activities: mapActivities(f),
        reservation: f.Reservable ? "reservable" : "fcfs",
        reservationUrl: f.Reservable
          ? `https://www.recreation.gov/camping/campgrounds/${f.FacilityID}`
          : undefined,
      });
    }
    console.log(`[ridb] page ${page}: ${campsites.length} campgrounds so far`);
  }
  return campsites;
}
