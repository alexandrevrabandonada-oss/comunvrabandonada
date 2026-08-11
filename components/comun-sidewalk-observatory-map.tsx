"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import { createSidewalkMapLibreStyle } from "@/lib/sidewalk-maplibre-style";
import type { PublicObservation } from "@/lib/comun-observatory";
import { SIDEWALK_CONDITION_LABELS } from "@/lib/comun-sidewalk-observatory";

export function ComunSidewalkObservatoryMap({
  provider,
  observations,
  onSelect,
}: {
  provider: SidewalkBasemapProvider;
  observations: readonly PublicObservation[];
  onSelect: (observation: PublicObservation) => void;
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
          maxBounds: [
            [provider.bounds[0], provider.bounds[1]],
            [provider.bounds[2], provider.bounds[3]],
          ],
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(
          new maplibre.default.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.addControl(
          new maplibre.default.AttributionControl({
            compact: false,
            customAttribution: provider.attribution,
          }),
        );
        map.on("load", () => {
          for (const observation of observations) {
            const point = observation.geography.geometry?.coordinates;
            if (!point) continue;
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = "sidewalk-map-marker";
            marker.textContent = "!";
            marker.setAttribute(
              "aria-label",
              `Abrir ponto revisado com condição ${SIDEWALK_CONDITION_LABELS[observation.attributes.condition]}`,
            );
            marker.onclick = () => onSelect(observation);
            markers.current.push(
              new maplibre.default.Marker({ element: marker })
                .setLngLat(point)
                .addTo(map),
            );
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
  }, [provider, observations, onSelect]);

  if (failed) {
    return (
      <div
        role="status"
        className="grid min-h-[22rem] place-items-center border-2 border-comun-black bg-comun-paper p-6 text-center"
      >
        <div className="max-w-sm">
          <strong>Mapa-base temporariamente indisponível.</strong>
          <p className="mt-2 text-sm">
            A lista textual abaixo contém os mesmos pontos revisados da seleção.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={host}
      role="region"
      aria-label="Mapa de pontos de calçadas revisados e publicados com localização aproximada"
      className="min-h-[22rem] w-full border-2 border-comun-black sm:min-h-[30rem]"
      data-map-provider={provider.id}
    />
  );
}
