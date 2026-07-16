"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { ScoredCampsite, SearchLocation } from "../lib/types";
import "leaflet/dist/leaflet.css";

interface Props {
  results: ScoredCampsite[];
  center: SearchLocation;
}

export default function MapView({ results, center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView(
          [center.lat, center.lon],
          9
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
        markersRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const map = mapRef.current;
      const markers = markersRef.current!;
      markers.clearLayers();

      const centerIcon = L.divIcon({
        html: "📍",
        className: "text-2xl",
        iconAnchor: [12, 24],
      });
      L.marker([center.lat, center.lon], { icon: centerIcon })
        .bindPopup(center.label)
        .addTo(markers);

      const siteIcon = L.divIcon({
        html: "⛺",
        className: "text-xl",
        iconAnchor: [10, 20],
      });
      for (const r of results) {
        L.marker([r.campsite.lat, r.campsite.lon], { icon: siteIcon })
          .bindPopup(
            `<strong>${r.campsite.name}</strong><br/>${r.distanceMiles} mi · score ${r.score}`
          )
          .addTo(markers);
      }

      if (results.length) {
        const bounds = L.latLngBounds([
          [center.lat, center.lon],
          ...results.map(
            (r) => [r.campsite.lat, r.campsite.lon] as [number, number]
          ),
        ]);
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView([center.lat, center.lon], 9);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [results, center]);

  // Tear the map down only on unmount.
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="h-80 w-full rounded-xl border border-stone-200 shadow-sm"
    />
  );
}
