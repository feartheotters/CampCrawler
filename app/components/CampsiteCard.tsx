"use client";

import {
  AMENITY_LABELS,
  CAMPING_TYPE_LABELS,
} from "../lib/constants";
import type { ScoredCampsite, SearchParams } from "../lib/types";

interface Props {
  result: ScoredCampsite;
  params: SearchParams;
}

function priceLabel(min?: number, max?: number): string {
  if (min === undefined) return "Price unknown";
  if (min === 0 && (max === undefined || max === 0)) return "Free";
  if (max !== undefined && max !== min) return `$${min}–$${max}/night`;
  return `$${min}/night`;
}

export default function CampsiteCard({ result, params }: Props) {
  const { campsite: site, distanceMiles, score, highlights } = result;

  // Deep-link to availability for the chosen dates when booking on recreation.gov.
  let bookingUrl = site.reservationUrl;
  if (bookingUrl?.includes("recreation.gov") && params.startDate) {
    bookingUrl = `${bookingUrl}?tab=campsites&startDate=${params.startDate}&endDate=${params.endDate}`;
  }

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{site.name}</h3>
          <p className="text-xs text-stone-500">
            {[site.agency, site.state, `${distanceMiles} mi away`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"
          title="Match score"
        >
          {score}
        </span>
      </div>

      {highlights.length > 0 && (
        <p className="mt-1 text-xs text-emerald-700">
          {highlights.join(" · ")}
        </p>
      )}

      {site.description && (
        <p className="mt-2 line-clamp-2 text-sm text-stone-600">
          {site.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {site.campingTypes.map((t) => (
          <span
            key={t}
            className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600"
          >
            {CAMPING_TYPE_LABELS[t]}
          </span>
        ))}
        {site.amenities.slice(0, 6).map((a) => (
          <span
            key={a}
            className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-500"
          >
            {AMENITY_LABELS[a]}
          </span>
        ))}
        {site.amenities.length > 6 && (
          <span className="px-1 text-[11px] text-stone-400">
            +{site.amenities.length - 6} more
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-stone-700">
          <span className="font-medium">
            {priceLabel(site.priceMin, site.priceMax)}
          </span>
          {site.rating !== undefined && (
            <span className="ml-2 text-stone-500">
              {site.rating.toFixed(1)}★
              {site.reviewCount ? ` (${site.reviewCount})` : ""}
            </span>
          )}
          {site.maxRigLength !== undefined && (
            <span className="ml-2 text-stone-500">
              rigs to {site.maxRigLength} ft
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {site.sourceUrl && (
            <a
              href={site.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
            >
              Details
            </a>
          )}
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Check availability
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
