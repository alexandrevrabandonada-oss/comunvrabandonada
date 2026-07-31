"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { SidewalkBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import { createSidewalkMapLibreStyle } from "@/lib/sidewalk-maplibre-style";
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
        const style = createSidewalkMapLibreStyle(provider);
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
        const geolocate = new maplibre.default.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
          showAccuracyCircle: true,
        });
        map.addControl(geolocate, "top-right");
        const geolocateButton = host.current.querySelector<HTMLButtonElement>(
          ".maplibregl-ctrl-geolocate",
        );
        if (geolocateButton) {
          geolocateButton.setAttribute(
            "aria-label",
            "Usar minha localização aproximada",
          );
          geolocateButton.title = "Usar minha localização aproximada";
        }
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
