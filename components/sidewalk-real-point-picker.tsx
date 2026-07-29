"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { realBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import {
  createSidewalkMapLibreStyle,
  SIDEWALK_REAL_ROAD_LAYER_ID,
} from "@/lib/sidewalk-maplibre-style";
import {
  unprojectMercator,
  VOLTA_REDONDA_MAP,
} from "@/lib/sidewalk-map-config";

export function SidewalkRealPointPicker({
  point,
  accuracy,
  onChange,
}: {
  point: [number, number] | null;
  accuracy: number | null;
  onChange: (point: [number, number]) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapLibreMap | null>(null),
    [markerPosition, setMarkerPosition] = useState<{
      x: number;
      y: number;
    } | null>(null),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host.current || !realBasemapProvider.style.pmtilesUrl) return;
    let cancelled = false;
    Promise.all([import("maplibre-gl"), import("pmtiles")])
      .then(([maplibre, { Protocol }]) => {
        if (cancelled || !host.current) return;
        const protocol = new Protocol();
        try {
          maplibre.default.addProtocol("pmtiles", protocol.tile);
        } catch {
          // O protocolo pode já estar registrado por outro mapa na mesma página.
        }
        const map = new maplibre.default.Map({
          container: host.current,
          style: createSidewalkMapLibreStyle(realBasemapProvider),
          center: point ?? realBasemapProvider.center,
          zoom: point ? 16 : 12,
          minZoom: realBasemapProvider.minZoom,
          maxZoom: realBasemapProvider.maxZoom,
          maxBounds: [
            [realBasemapProvider.bounds[0], realBasemapProvider.bounds[1]],
            [realBasemapProvider.bounds[2], realBasemapProvider.bounds[3]],
          ],
          attributionControl: false,
          interactive: false,
        });
        mapRef.current = map;
        const updateMarker = () => {
          if (!point) return setMarkerPosition(null);
          const projected = map.project(point);
          setMarkerPosition({ x: projected.x, y: projected.y });
        };
        map.on("load", () => {
          setReady(true);
          updateMarker();
        });
        map.on("move", updateMarker);
        map.on("resize", updateMarker);
        map.on("error", () => setFailed(true));
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // A instância é criada uma única vez; atualizações de ponto são tratadas abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !point) return;
    map.easeTo({
      center: point,
      zoom: Math.max(map.getZoom(), 15),
      duration: 350,
    });
    const projected = map.project(point);
    setMarkerPosition({ x: projected.x, y: projected.y });
  }, [point, ready]);

  const updateFromKeyboard = (key: string, shiftKey: boolean) => {
    const current = point ?? VOLTA_REDONDA_MAP.center;
    const delta = shiftKey ? 0.002 : 0.0005;
    const next: Record<string, [number, number]> = {
      ArrowLeft: [current[0] - delta, current[1]],
      ArrowRight: [current[0] + delta, current[1]],
      ArrowUp: [current[0], current[1] + delta],
      ArrowDown: [current[0], current[1] - delta],
    };
    if (next[key]) onChange(next[key]);
    return Boolean(next[key]);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Mapa para confirmar ou ajustar o ponto"
        aria-describedby="manual-point-help"
        data-map-provider="realVoltaRedonda"
        data-pmtiles-loaded={ready}
        data-road-layer={SIDEWALK_REAL_ROAD_LAYER_ID}
        onKeyDown={(event) => {
          if (!updateFromKeyboard(event.key, event.shiftKey)) return;
          event.preventDefault();
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            onChange(point ?? VOLTA_REDONDA_MAP.center);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect(),
            x = event.clientX - rect.left,
            y = event.clientY - rect.top,
            map = mapRef.current;
          if (map && ready) {
            const next = map.unproject([x, y]);
            onChange([next.lng, next.lat]);
            return;
          }
          onChange(unprojectMercator(x / rect.width, y / rect.height));
        }}
        className="relative mt-3 block h-56 w-full touch-manipulation overflow-hidden border-2 bg-[#ecebe5] text-left sm:h-64 lg:h-72"
      >
        <div
          ref={host}
          className="absolute inset-0 size-full"
          aria-hidden="true"
        />
        {failed ? (
          <span className="absolute inset-0 grid place-items-center bg-[#ecebe5] p-6 text-center font-bold">
            Mapa-base indisponível. O ponto ainda pode ser marcado de forma
            aproximada.
          </span>
        ) : null}
        {markerPosition ? (
          <>
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-700 bg-blue-300/25"
              style={{
                left: markerPosition.x,
                top: markerPosition.y,
                width: accuracy ? Math.min(120, Math.max(30, accuracy)) : 30,
                height: accuracy ? Math.min(120, Math.max(30, accuracy)) : 30,
              }}
            />
            <span
              className="pointer-events-none absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-comun-yellow"
              style={{ left: markerPosition.x, top: markerPosition.y }}
            >
              ●
            </span>
          </>
        ) : null}
        <span className="pointer-events-none absolute bottom-2 left-2 right-2 bg-white p-2 text-center text-xs font-bold shadow-[2px_2px_0_#0b0b0a]">
          Toque no mapa real para ajustar o marcador
        </span>
        <span className="pointer-events-none absolute right-2 top-2 bg-white/90 px-2 py-1 text-[10px] font-bold">
          © OpenStreetMap · IBGE
        </span>
      </button>
      <p id="manual-point-help" className="mt-2 text-sm">
        Toque em uma rua para ajustar o ponto. Com teclado, use as setas; Shift
        aumenta o deslocamento.
      </p>
    </>
  );
}
