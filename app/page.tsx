"use client";

import { useEffect, useMemo, useState } from "react";
import SearchForm from "./components/SearchForm";
import ResultsList from "./components/ResultsList";
import MapView from "./components/MapView";
import { loadDataset } from "./lib/data";
import { searchCampsites } from "./lib/filter";
import { defaultSearchParams } from "./lib/constants";
import type { CampsiteDataset, SearchParams } from "./lib/types";

export default function Home() {
  const [dataset, setDataset] = useState<CampsiteDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [params, setParams] = useState<SearchParams>(defaultSearchParams);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const results = useMemo(() => {
    if (!dataset || !params.location) return [];
    return searchCampsites(dataset.campsites, params);
  }, [dataset, params]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          ⛺ CampCrawler
        </h1>
        <p className="mt-1 text-stone-600">
          Search campsites across public lands and private camps — by dates,
          camping style, rig size, hookups, and amenities.
        </p>
        {dataset && (
          <p className="mt-1 text-xs text-stone-400">
            {dataset.campsites.length} campsites indexed · data refreshed{" "}
            {new Date(dataset.generatedAt).toLocaleDateString()}
          </p>
        )}
      </header>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          Could not load the campsite dataset: {loadError}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <SearchForm
          params={params}
          onChange={setParams}
          onSearch={() => setSearched(true)}
        />
        <section>
          {searched && params.location ? (
            <>
              <MapView results={results} center={params.location} />
              <ResultsList results={results} params={params} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
              Enter a destination and your trip details, then hit{" "}
              <span className="font-semibold">Find campsites</span>.
            </div>
          )}
        </section>
      </div>

      <footer className="mt-12 border-t border-stone-200 pt-4 text-xs text-stone-400">
        Data aggregated from Recreation.gov (RIDB), OpenStreetMap, and other
        sources via a scheduled crawl pipeline. Always verify availability with
        the operator before traveling.
      </footer>
    </main>
  );
}
