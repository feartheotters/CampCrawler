import type { Activity, Amenity, CampingType, SearchParams } from "./types";

export const BASE_PATH = "/CampCrawler";

export const DATASET_URL = `${BASE_PATH}/data/campsites.json`;

export const CAMPING_TYPE_LABELS: Record<CampingType, string> = {
  tent: "Tent",
  rv: "RV / Motorhome",
  trailer: "Trailer / 5th Wheel",
  van: "Van / Car",
  cabin: "Cabin / Yurt",
  glamping: "Glamping",
  group: "Group Site",
  dispersed: "Dispersed / Boondocking",
  backcountry: "Backcountry",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  drinking_water: "Drinking water",
  flush_toilets: "Flush toilets",
  vault_toilets: "Vault toilets",
  showers: "Showers",
  picnic_tables: "Picnic tables",
  fire_rings: "Fire rings",
  campfires_allowed: "Campfires allowed",
  trash: "Trash service",
  dump_station: "Dump station",
  laundry: "Laundry",
  camp_store: "Camp store",
  wifi: "WiFi",
  playground: "Playground",
  boat_ramp: "Boat ramp",
  waterfront: "Waterfront",
  shade: "Shade",
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  hiking: "Hiking",
  fishing: "Fishing",
  swimming: "Swimming",
  boating: "Boating",
  paddling: "Kayaking / Paddling",
  climbing: "Climbing",
  biking: "Biking",
  wildlife: "Wildlife viewing",
  stargazing: "Stargazing",
  horseback: "Horseback riding",
  off_roading: "Off-roading",
  winter_sports: "Winter sports",
};

export function defaultSearchParams(): SearchParams {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    location: null,
    radiusMiles: 50,
    startDate: iso(start),
    endDate: iso(end),
    campingTypes: ["tent"],
    rigLengthFt: undefined,
    needsElectric: false,
    minAmps: undefined,
    needsWater: false,
    needsSewer: false,
    needsPullThrough: false,
    partySize: 2,
    petsRequired: false,
    accessibleRequired: false,
    requiredAmenities: [],
    desiredActivities: [],
    maxPricePerNight: undefined,
    freeOnly: false,
    reservationMode: "any",
  };
}
