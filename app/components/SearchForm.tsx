"use client";

import { useState } from "react";
import {
  ACTIVITY_LABELS,
  AMENITY_LABELS,
  CAMPING_TYPE_LABELS,
} from "../lib/constants";
import { geocode } from "../lib/geo";
import type {
  Activity,
  Amenity,
  CampingType,
  SearchParams,
} from "../lib/types";

interface Props {
  params: SearchParams;
  onChange: (params: SearchParams) => void;
  onSearch: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-stone-200 pt-4">
      <legend className="pr-2 text-sm font-semibold text-stone-700">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";

export default function SearchForm({ params, onChange, onSearch }: Props) {
  const [locationQuery, setLocationQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const set = <K extends keyof SearchParams>(key: K, value: SearchParams[K]) =>
    onChange({ ...params, [key]: value });

  const toggleInList = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const rvTrip = params.campingTypes.some((t) =>
    ["rv", "trailer", "van"].includes(t)
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setGeoError(null);
    let location = params.location;
    if (locationQuery.trim()) {
      setGeocoding(true);
      try {
        location = await geocode(locationQuery.trim());
      } finally {
        setGeocoding(false);
      }
      if (!location) {
        setGeoError(`Couldn't find "${locationQuery}" — try a nearby city.`);
        return;
      }
      onChange({ ...params, location });
    }
    if (!location) {
      setGeoError("Enter a destination first.");
      return;
    }
    onSearch();
  }

  function useMyLocation() {
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationQuery("");
        onChange({
          ...params,
          location: {
            label: "My location",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          },
        });
      },
      () => setGeoError("Couldn't get your location.")
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex h-fit flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <Section title="Where">
        <input
          type="text"
          className={inputClass}
          placeholder="City, park, or region (e.g. Yosemite)"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="text-xs text-emerald-700 underline"
          >
            Use my location
          </button>
          {params.location && (
            <span className="truncate text-xs text-stone-500">
              📍 {params.location.label}
            </span>
          )}
        </div>
        <label className="mt-3 block text-xs text-stone-600">
          Search radius: {params.radiusMiles} mi
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={params.radiusMiles}
            onChange={(e) => set("radiusMiles", Number(e.target.value))}
            className="mt-1 w-full accent-emerald-600"
          />
        </label>
        {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
      </Section>

      <Section title="When">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-600">
            Arrive
            <input
              type="date"
              className={inputClass}
              value={params.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </label>
          <label className="text-xs text-stone-600">
            Depart
            <input
              type="date"
              className={inputClass}
              value={params.endDate}
              min={params.startDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </label>
        </div>
      </Section>

      <Section title="Camping style">
        <div className="flex flex-wrap gap-1.5">
          {(
            Object.entries(CAMPING_TYPE_LABELS) as [CampingType, string][]
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                set("campingTypes", toggleInList(params.campingTypes, type))
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                params.campingTypes.includes(type)
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-stone-300 text-stone-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {rvTrip && (
        <Section title="Rig & hookups">
          <label className="block text-xs text-stone-600">
            Rig length (ft)
            <input
              type="number"
              min={10}
              max={60}
              className={inputClass}
              value={params.rigLengthFt ?? ""}
              placeholder="e.g. 28"
              onChange={(e) =>
                set(
                  "rigLengthFt",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </label>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.needsElectric}
                onChange={(e) => set("needsElectric", e.target.checked)}
                className="accent-emerald-600"
              />
              Electric hookup
            </label>
            {params.needsElectric && (
              <select
                className={inputClass}
                value={params.minAmps ?? ""}
                onChange={(e) =>
                  set(
                    "minAmps",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              >
                <option value="">Any amperage</option>
                <option value="30">30 amp+</option>
                <option value="50">50 amp</option>
              </select>
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.needsWater}
                onChange={(e) => set("needsWater", e.target.checked)}
                className="accent-emerald-600"
              />
              Water hookup
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.needsSewer}
                onChange={(e) => set("needsSewer", e.target.checked)}
                className="accent-emerald-600"
              />
              Sewer hookup
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={params.needsPullThrough}
                onChange={(e) => set("needsPullThrough", e.target.checked)}
                className="accent-emerald-600"
              />
              Pull-through site
            </label>
          </div>
        </Section>
      )}

      <Section title="Party">
        <div className="flex flex-col gap-1.5 text-sm">
          <label className="text-xs text-stone-600">
            People
            <input
              type="number"
              min={1}
              max={50}
              className={inputClass}
              value={params.partySize}
              onChange={(e) => set("partySize", Number(e.target.value) || 1)}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={params.petsRequired}
              onChange={(e) => set("petsRequired", e.target.checked)}
              className="accent-emerald-600"
            />
            Traveling with pets
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={params.accessibleRequired}
              onChange={(e) => set("accessibleRequired", e.target.checked)}
              className="accent-emerald-600"
            />
            ADA-accessible site needed
          </label>
        </div>
      </Section>

      <Section title="Must-have amenities">
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(AMENITY_LABELS) as [Amenity, string][]).map(
            ([amenity, label]) => (
              <button
                key={amenity}
                type="button"
                onClick={() =>
                  set(
                    "requiredAmenities",
                    toggleInList(params.requiredAmenities, amenity)
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  params.requiredAmenities.includes(amenity)
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 text-stone-600"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </Section>

      <Section title="Activities (nice to have)">
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(ACTIVITY_LABELS) as [Activity, string][]).map(
            ([activity, label]) => (
              <button
                key={activity}
                type="button"
                onClick={() =>
                  set(
                    "desiredActivities",
                    toggleInList(params.desiredActivities, activity)
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  params.desiredActivities.includes(activity)
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 text-stone-600"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </Section>

      <Section title="Price & booking">
        <label className="block text-xs text-stone-600">
          Max price per night ($)
          <input
            type="number"
            min={0}
            className={inputClass}
            value={params.maxPricePerNight ?? ""}
            placeholder="Any"
            disabled={params.freeOnly}
            onChange={(e) =>
              set(
                "maxPricePerNight",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.freeOnly}
            onChange={(e) => set("freeOnly", e.target.checked)}
            className="accent-emerald-600"
          />
          Free camping only
        </label>
        <select
          className={`${inputClass} mt-2`}
          value={params.reservationMode}
          onChange={(e) =>
            set(
              "reservationMode",
              e.target.value as SearchParams["reservationMode"]
            )
          }
        >
          <option value="any">Reservable or first-come</option>
          <option value="reservable">Reservable only</option>
          <option value="fcfs">First-come, first-served only</option>
        </select>
      </Section>

      <button
        type="submit"
        disabled={geocoding}
        className="mt-2 rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {geocoding ? "Locating…" : "Find campsites"}
      </button>
    </form>
  );
}
