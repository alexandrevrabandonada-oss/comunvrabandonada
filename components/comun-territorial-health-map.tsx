"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { TerritorialContextHealthPoint } from "@/lib/comun-observatory-territorial-context";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import { createSidewalkMapLibreStyle } from "@/lib/sidewalk-maplibre-style";

export function ComunTerritorialHealthMap({
  points,
  provider,
  onSelect,
}: {
  points: readonly TerritorialContextHealthPoint[];
  provider: SidewalkBasemapProvider;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<MapLibreMarker[]>([]);
  const [failed, setFailed] = useState(!provider.enabled);

  useEffect(() => {
    if (!host.current || !provider.enabled || !provider.style.pmtilesUrl) return;
    let cancelled = false;
    Promise.all([import("maplibre-gl"), import("pmtiles")])
      .then(([maplibre, { Protocol }]) => {
        if (cancelled || !host.current) return;
        const protocol = new Protocol();
        maplibre.default.addProtocol("pmtiles", protocol.tile);
        const map = new maplibre.default.Map({
          container: host.current,
          style: createSidewalkMapLibreStyle(provider),
          center: provider.center,
          zoom: 12,
          minZoom: provider.minZoom,
          maxZoom: provider.maxZoom,
          maxBounds: [[provider.bounds[0], provider.bounds[1]], [provider.bounds[2], provider.bounds[3]]],
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibre.default.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibre.default.AttributionControl({ compact: false, customAttribution: provider.attribution }));
        map.on("load", () => {
          for (const point of points) {
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = "sidewalk-map-marker";
            marker.textContent = "+";
            marker.setAttribute("aria-label", `Abrir equipamento público de Saúde: ${point.officialName}`);
            marker.onclick = () => onSelect(point.id);
            markers.current.push(new maplibre.default.Marker({ element: marker })
              .setLngLat([point.point.longitude, point.point.latitude])
              .addTo(map));
          }
        });
        map.on("error", () => setFailed(true));
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onSelect, points, provider]);

  if (failed) return <div role="status" className="grid min-h-[22rem] place-items-center border-2 border-comun-black bg-comun-paper p-6 text-center"><p><strong>Mapa-base temporariamente indisponível.</strong><br />A lista textual abaixo contém os equipamentos públicos de Saúde.</p></div>;
  return <div ref={host} role="region" aria-label="Mapa de equipamentos públicos de Saúde com coordenadas oficiais" className="min-h-[22rem] w-full border-2 border-comun-black sm:min-h-[30rem]" data-map-provider={provider.id} />;
}
