"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import {
  pointCoordinates,
  type PublicSidewalkRecord,
} from "@/lib/sidewalk-map-config";

export function SidewalkMapLibreMap({
  provider,
  records,
  onSelect,
}: {
  provider: SidewalkBasemapProvider;
  records: PublicSidewalkRecord[];
  onSelect: (record: PublicSidewalkRecord) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapLibreMap | null>(null),
    markers = useRef<MapLibreMarker[]>([]),
    [failed, setFailed] = useState(!provider.enabled);
  useEffect(() => {
    if (!host.current || !provider.enabled || !provider.style.pmtilesUrl)
      return;
    let cancelled = false;
    Promise.all([import("maplibre-gl"), import("pmtiles")])
      .then(([maplibre, { Protocol }]) => {
        if (cancelled || !host.current) return;
        const protocol = new Protocol();
        maplibre.default.addProtocol("pmtiles", protocol.tile);
        const style: StyleSpecification = {
          version: 8,
          sources: {
            comun: {
              type: "vector",
              url: `pmtiles://${provider.style.pmtilesUrl}`,
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#ecebe5" },
            },
            {
              id: "water",
              type: "fill",
              source: "comun",
              "source-layer": "osm",
              filter: [
                "any",
                ["has", "water"],
                ["==", ["get", "natural"], "water"],
              ],
              paint: { "fill-color": "#9fcbd3" },
            },
            {
              id: "buildings",
              type: "fill",
              source: "comun",
              "source-layer": "osm",
              filter: ["has", "building"],
              minzoom: 14,
              paint: {
                "fill-color": "#d4d0c5",
                "fill-outline-color": "#aaa59a",
              },
            },
            {
              id: "roads",
              type: "line",
              source: "comun",
              "source-layer": "osm",
              filter: ["any", ["has", "highway"], ["has", "railway"]],
              paint: {
                "line-color": "#ffffff",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  1,
                  17,
                  7,
                ],
              },
            },
            {
              id: "road-labels",
              type: "symbol",
              source: "comun",
              "source-layer": "osm",
              filter: [
                "all",
                ["has", "name"],
                ["any", ["has", "highway"], ["has", "railway"]],
              ],
              layout: {
                "text-field": ["coalesce", ["get", "name"], ""],
                "text-size": 12,
              },
            },
            {
              id: "municipal-boundary",
              type: "line",
              source: "comun",
              "source-layer": "boundary",
              paint: {
                "line-color": "#26352a",
                "line-width": 2,
                "line-dasharray": [3, 2],
              },
            },
          ],
        };
        const map = new maplibre.default.Map({
          container: host.current,
          style,
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
          new maplibre.default.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
            showAccuracyCircle: true,
          }),
          "top-right",
        );
        map.addControl(
          new maplibre.default.AttributionControl({
            compact: false,
            customAttribution: provider.attribution,
          }),
        );
        map.on("load", () => {
          for (const record of records) {
            const point = pointCoordinates(record);
            if (!point) continue;
            const el = document.createElement("button");
            el.type = "button";
            el.className = "sidewalk-map-marker";
            el.setAttribute("aria-label", `Abrir ${record.name}`);
            el.textContent = "!";
            el.onclick = () => onSelect(record);
            markers.current.push(
              new maplibre.default.Marker({ element: el })
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
  }, [provider, records, onSelect]);
  if (failed)
    return (
      <div
        role="status"
        data-testid="sidewalk-real-map-fallback"
        className="grid min-h-[58vh] place-items-center bg-[#ecebe5] p-8 text-center"
        style={{
          backgroundImage:
            "linear-gradient(#d2d8d1 1px, transparent 1px), linear-gradient(90deg, #d2d8d1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-sm border-2 border-comun-black bg-white p-5 shadow-[3px_3px_0_#0b0b0a]">
          <strong>Mapa-base indisponível.</strong>
          <p className="mt-2 text-sm">
            A lista de registros continua disponível. Tente novamente mais
            tarde.
          </p>
        </div>
      </div>
    );
  return (
    <div
      ref={host}
      role="region"
      className="min-h-[58vh] w-full lg:min-h-[64vh]"
      aria-label="Mapa real de Volta Redonda com registros públicos de calçadas"
      data-map-provider={provider.id}
    />
  );
}
