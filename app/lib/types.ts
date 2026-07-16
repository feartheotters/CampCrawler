// Domain model shared by the webapp and the crawler pipeline.

export type CampingType =
  | "tent"
  | "rv"
  | "trailer"
  | "van"
  | "cabin"
  | "glamping"
  | "group"
  | "dispersed"
  | "backcountry";

export type DataSource = "ridb" | "osm" | "hipcamp" | "campendium" | "seed";

export type ReservationMode = "reservable" | "fcfs" | "both" | "unknown";

export type Amenity =
  | "drinking_water"
  | "flush_toilets"
  | "vault_toilets"
  | "showers"
  | "picnic_tables"
  | "fire_rings"
  | "campfires_allowed"
  | "trash"
  | "dump_station"
  | "laundry"
  | "camp_store"
  | "wifi"
  | "playground"
  | "boat_ramp"
  | "waterfront"
  | "shade";

export type Activity =
  | "hiking"
  | "fishing"
  | "swimming"
  | "boating"
  | "paddling"
  | "climbing"
  | "biking"
  | "wildlife"
  | "stargazing"
  | "horseback"
  | "off_roading"
  | "winter_sports";

export interface Hookups {
  /** Available electric amperages, e.g. [30, 50]. Empty = no electric. */
  electricAmps: number[];
  water: boolean;
  sewer: boolean;
}

export interface Season {
  /** "MM-DD" inclusive open date, e.g. "05-15". */
  open: string;
  /** "MM-DD" inclusive close date, e.g. "10-01". */
  close: string;
}

export interface Campsite {
  id: string;
  source: DataSource;
  sourceUrl?: string;
  name: string;
  description?: string;
  lat: number;
  lon: number;
  state?: string;
  /** Managing agency or owner: NPS, USFS, BLM, State Park, Private, ... */
  agency?: string;
  campingTypes: CampingType[];
  /** Longest rig (RV/trailer) accommodated, in feet. Undefined = unknown. */
  maxRigLength?: number;
  hookups: Hookups;
  pullThrough?: boolean;
  /** Max people per site. */
  maxPeople?: number;
  petsAllowed?: boolean;
  /** ADA-accessible sites available. */
  accessible?: boolean;
  amenities: Amenity[];
  activities: Activity[];
  /** USD per night. 0 = free. Undefined = unknown. */
  priceMin?: number;
  priceMax?: number;
  reservation: ReservationMode;
  reservationUrl?: string;
  /** "year-round" or an open/close window. Undefined = unknown. */
  season?: Season | "year-round";
  elevationFt?: number;
  cellCoverage?: boolean;
  rating?: number;
  reviewCount?: number;
  totalSites?: number;
}

export interface CampsiteDataset {
  generatedAt: string;
  sources: Partial<Record<DataSource, number>>;
  campsites: Campsite[];
}

export interface SearchLocation {
  label: string;
  lat: number;
  lon: number;
}

export interface SearchParams {
  location: SearchLocation | null;
  radiusMiles: number;
  /** ISO dates "YYYY-MM-DD". */
  startDate: string;
  endDate: string;
  campingTypes: CampingType[];
  /** Rig length in feet; only meaningful for rv/trailer/van trips. */
  rigLengthFt?: number;
  needsElectric: boolean;
  /** Minimum amperage when electric is required (30 or 50). */
  minAmps?: number;
  needsWater: boolean;
  needsSewer: boolean;
  needsPullThrough: boolean;
  partySize: number;
  petsRequired: boolean;
  accessibleRequired: boolean;
  requiredAmenities: Amenity[];
  desiredActivities: Activity[];
  maxPricePerNight?: number;
  freeOnly: boolean;
  reservationMode: "any" | "reservable" | "fcfs";
}

export interface ScoredCampsite {
  campsite: Campsite;
  distanceMiles: number;
  /** 0-100 relevance score. */
  score: number;
  /** Human-readable reasons the site matched well. */
  highlights: string[];
}
