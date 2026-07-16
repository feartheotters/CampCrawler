import { describe, expect, it } from "vitest";
import { searchCampsites, seasonCoversTrip } from "./filter";
import { defaultSearchParams } from "./constants";
import type { Campsite, SearchParams } from "./types";

function makeSite(overrides: Partial<Campsite> = {}): Campsite {
  return {
    id: "test-1",
    source: "seed",
    name: "Test Campground",
    lat: 40.0,
    lon: -105.0,
    campingTypes: ["tent"],
    hookups: { electricAmps: [], water: false, sewer: false },
    amenities: [],
    activities: [],
    reservation: "reservable",
    ...overrides,
  };
}

function makeParams(overrides: Partial<SearchParams> = {}): SearchParams {
  return {
    ...defaultSearchParams(),
    location: { label: "Boulder, CO", lat: 40.01, lon: -105.27 },
    radiusMiles: 50,
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    ...overrides,
  };
}

describe("seasonCoversTrip", () => {
  it("accepts unknown and year-round seasons", () => {
    expect(seasonCoversTrip(undefined, "2026-08-01", "2026-08-03")).toBe(true);
    expect(seasonCoversTrip("year-round", "2026-08-01", "2026-08-03")).toBe(
      true
    );
  });

  it("checks trips against a summer season window", () => {
    const season = { open: "05-15", close: "10-01" };
    expect(seasonCoversTrip(season, "2026-08-01", "2026-08-03")).toBe(true);
    expect(seasonCoversTrip(season, "2026-04-01", "2026-04-03")).toBe(false);
    expect(seasonCoversTrip(season, "2026-11-10", "2026-11-12")).toBe(false);
  });

  it("handles seasons that wrap the new year", () => {
    const season = { open: "10-01", close: "04-30" };
    expect(seasonCoversTrip(season, "2026-12-20", "2026-12-23")).toBe(true);
    expect(seasonCoversTrip(season, "2026-02-01", "2026-02-03")).toBe(true);
    expect(seasonCoversTrip(season, "2026-07-01", "2026-07-03")).toBe(false);
  });
});

describe("searchCampsites hard filters", () => {
  it("excludes sites beyond the radius", () => {
    const near = makeSite({ id: "near" });
    const far = makeSite({ id: "far", lat: 45.0, lon: -110.0 });
    const results = searchCampsites([near, far], makeParams());
    expect(results.map((r) => r.campsite.id)).toEqual(["near"]);
  });

  it("filters by camping type", () => {
    const tentOnly = makeSite({ id: "tent", campingTypes: ["tent"] });
    const rvPark = makeSite({ id: "rv", campingTypes: ["rv", "trailer"] });
    const results = searchCampsites(
      [tentOnly, rvPark],
      makeParams({ campingTypes: ["rv"] })
    );
    expect(results.map((r) => r.campsite.id)).toEqual(["rv"]);
  });

  it("excludes sites whose max rig length is too short", () => {
    const shortSite = makeSite({
      id: "short",
      campingTypes: ["rv"],
      maxRigLength: 25,
    });
    const longSite = makeSite({
      id: "long",
      campingTypes: ["rv"],
      maxRigLength: 40,
    });
    const unknownSite = makeSite({ id: "unknown", campingTypes: ["rv"] });
    const results = searchCampsites(
      [shortSite, longSite, unknownSite],
      makeParams({ campingTypes: ["rv"], rigLengthFt: 32 })
    );
    expect(results.map((r) => r.campsite.id).sort()).toEqual([
      "long",
      "unknown",
    ]);
  });

  it("enforces hookup requirements including amperage", () => {
    const thirtyAmp = makeSite({
      id: "thirty",
      campingTypes: ["rv"],
      hookups: { electricAmps: [30], water: true, sewer: false },
    });
    const fiftyAmp = makeSite({
      id: "fifty",
      campingTypes: ["rv"],
      hookups: { electricAmps: [30, 50], water: true, sewer: true },
    });
    const results = searchCampsites(
      [thirtyAmp, fiftyAmp],
      makeParams({
        campingTypes: ["rv"],
        needsElectric: true,
        minAmps: 50,
        needsSewer: true,
      })
    );
    expect(results.map((r) => r.campsite.id)).toEqual(["fifty"]);
  });

  it("excludes sites closed for the trip dates", () => {
    const summer = makeSite({
      id: "summer",
      season: { open: "05-15", close: "09-30" },
    });
    const results = searchCampsites(
      [summer],
      makeParams({ startDate: "2026-12-01", endDate: "2026-12-03" })
    );
    expect(results).toHaveLength(0);
  });

  it("respects pets, price, and reservation-mode filters", () => {
    const noPets = makeSite({ id: "nopets", petsAllowed: false });
    const pricey = makeSite({ id: "pricey", priceMin: 120 });
    const fcfs = makeSite({ id: "fcfs", reservation: "fcfs", priceMin: 10 });
    const good = makeSite({
      id: "good",
      petsAllowed: true,
      priceMin: 20,
      reservation: "reservable",
    });
    const results = searchCampsites(
      [noPets, pricey, fcfs, good],
      makeParams({
        petsRequired: true,
        maxPricePerNight: 50,
        reservationMode: "reservable",
      })
    );
    expect(results.map((r) => r.campsite.id)).toEqual(["good"]);
  });

  it("free-only keeps only zero-cost sites", () => {
    const free = makeSite({ id: "free", priceMin: 0 });
    const paid = makeSite({ id: "paid", priceMin: 25 });
    const unknown = makeSite({ id: "unknown" });
    const results = searchCampsites(
      [free, paid, unknown],
      makeParams({ freeOnly: true })
    );
    expect(results.map((r) => r.campsite.id)).toEqual(["free"]);
  });
});

describe("searchCampsites ranking", () => {
  it("ranks closer, better-rated sites first", () => {
    const close = makeSite({
      id: "close",
      rating: 4.8,
      reviewCount: 500,
    });
    const farther = makeSite({
      id: "farther",
      lat: 40.6,
      lon: -105.1,
      rating: 3.2,
      reviewCount: 20,
    });
    const results = searchCampsites([close, farther], makeParams());
    expect(results).toHaveLength(2);
    expect(results[0].campsite.id).toBe("close");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("rewards matching desired activities", () => {
    const hiker = makeSite({ id: "hiker", activities: ["hiking", "fishing"] });
    const plain = makeSite({ id: "plain" });
    const results = searchCampsites(
      [hiker, plain],
      makeParams({ desiredActivities: ["hiking", "fishing"] })
    );
    expect(results[0].campsite.id).toBe("hiker");
  });
});
