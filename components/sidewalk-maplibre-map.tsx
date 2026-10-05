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
    [failure, setFailure] = useState<
      | "provider_disabled"
      | "dependency"
      | "initialization"
      | "render"
      | "gpu_context"
      | null
    >(provider.enabled ? null : "provider_disabled");
  useEffect(() => {
    if (!host.current || !provider.enabled || !provider.style.pmtilesUrl)
      return;
    let cancelled = false;
    let stage: "dependency" | "initialization" | "render" = "dependency";
    let isGpuError = (_error: unknown) => false;
    // Publish only a fixed category. Error messages can include URLs, tokens
    // or locations and must never be attached to the DOM or sent as telemetry.
    const fail = (error: unknown) => {
      if (!cancelled) setFailure(isGpuError(error) ? "gpu_context" : stage);
    };
    Promise.all([import("maplibre-gl"), import("pmtiles")])
      .then(([maplibre, { Protocol }]) => {
        if (cancelled || !host.current) return;
        stage = "initialization";
        isGpuError = (error) =>
          error instanceof maplibre.GPUInitializationError;
        host.current.setAttribute("data-pmtiles-loaded", "false");
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const protocol = new Protocol();
        maplibre.addProtocol("pmtiles", protocol.tile);
        const style = createSidewalkMapLibreStyle(provider);
        const map = new maplibre.Map({
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
          zoomLevelsToOverscale: undefined,
        });
        mapRef.current = map;
        stage = "render";
        map.addControl(
          new maplibre.NavigationControl({ showCompass: false }),
          "top-right",
        );
        const geolocate = new maplibre.GeolocateControl({
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
          new maplibre.AttributionControl({
            compact: false,
            customAttribution: provider.attribution,
          }),
        );
        map.on("load", () => {
          if (cancelled) return;
          host.current?.setAttribute("data-pmtiles-loaded", "true");
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
              new maplibre.Marker({ element: el }).setLngLat(point).addTo(map),
            );
          }
        });
        map.on("error", (event) => fail(event.error));
      })
      .catch(fail);
    return () => {
      cancelled = true;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [provider, records, onSelect]);
  if (failure)
    return (
      <div
        role="status"
        data-testid="sidewalk-real-map-fallback"
        data-map-failure={failure}
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
      data-pmtiles-loaded="false"
    />
  );
}
