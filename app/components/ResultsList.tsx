"use client";

import CampsiteCard from "./CampsiteCard";
import type { ScoredCampsite, SearchParams } from "../lib/types";

interface Props {
  results: ScoredCampsite[];
  params: SearchParams;
}

export default function ResultsList({ results, params }: Props) {
  if (!results.length) {
    return (
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        No campsites matched. Try widening the radius, relaxing must-have
        amenities, or different dates.
      </div>
    );
  }
  return (
    <div className="mt-4">
      <h2 className="mb-3 text-sm font-semibold text-stone-600">
        {results.length} candidate{results.length === 1 ? "" : "s"} near{" "}
        {params.location?.label}
      </h2>
      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <CampsiteCard key={r.campsite.id} result={r} params={params} />
        ))}
      </ul>
    </div>
  );
}
