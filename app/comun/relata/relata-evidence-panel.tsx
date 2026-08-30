"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ComunRelataEvidenceState } from "@/lib/comun-relata-evidence";

const SidewalkRealPointPicker = dynamic(
  () =>
    import("@/components/sidewalk-real-point-picker").then(
      (module) => module.SidewalkRealPointPicker,
    ),
  { ssr: false },
);

const EVIDENCE_ENDPOINT = "/api/comun/relata/evidence";

function locationLabel(state: ComunRelataEvidenceState["location"]) {
  return {
    not_added: "Não adicionada",
    added_private: "Adicionada privadamente",
    approximate_private: "Aproximada e privada",
    withdrawn: "Retirada",
  }[state];
}

export function RelataEvidencePanel({ withdrawn, attachmentsEnabled, locationEnabled }: { withdrawn: boolean; attachmentsEnabled: boolean; locationEnabled: boolean }) {
  const [evidence, setEvidence] = useState<ComunRelataEvidenceState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPoint, setMapPoint] = useState<[number, number] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(EVIDENCE_ENDPOINT, { cache: "no-store" });
    if (!response.ok) throw new Error("evidence_unavailable");
    const value = (await response.json()) as {
      evidence: ComunRelataEvidenceState;
    };
    setEvidence(value.evidence);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(EVIDENCE_ENDPOINT, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("evidence_unavailable");
        const value = (await response.json()) as {
          evidence: ComunRelataEvidenceState;
        };
        if (active) setEvidence(value.evidence);
      })
      .catch(() => {
        if (active)
          setNotice("As evidências privadas não puderam ser recuperadas agora.");
      });
    return () => {
      active = false;
    };
  }, [withdrawn]);

  const saveLocation = async (
    longitude: number,
    latitude: number,
    origin: "device" | "map_pin",
    accuracyMeters: number | null,
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`${EVIDENCE_ENDPOINT}/location`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          longitude,
          latitude,
          origin,
          accuracyMeters,
          capturedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("location_failed");
      const value = (await response.json()) as {
        evidence: ComunRelataEvidenceState;
      };
      setEvidence(value.evidence);
      setShowMap(false);
      setMapPoint(null);
      setNotice("Local guardado privadamente. A coordenada exata não será exibida.");
    } catch {
      setNotice("Não foi possível guardar o local. O relato continua salvo sem localização.");
    } finally {
      setBusy(false);
    }
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Este navegador não oferece localização. Você pode marcar no mapa ou pular.");
      return;
    }
    setBusy(true);
    setNotice("Aguardando a permissão de localização deste navegador…");
    navigator.geolocation.getCurrentPosition(
      (position) =>
        void saveLocation(
          position.coords.longitude,
          position.coords.latitude,
          "device",
          position.coords.accuracy,
        ),
      () => {
        setBusy(false);
        setNotice("A localização não foi autorizada. O relato continua salvo e você pode pular.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  };

  const addPhoto = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const start = await fetch(`${EVIDENCE_ENDPOINT}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }),
      });
      if (!start.ok) throw new Error("start_failed");
      const started = (await start.json()) as {
        upload: { label: string; url: string; method: "PUT"; contentType?: string; finalizeUrl?: string };
      };
      setNotice(`${started.upload.label} está sendo validada privadamente…`);
      const upload = await fetch(started.upload.url, {
        method: started.upload.method,
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`, "content-type": started.upload.contentType ?? (file.type || "application/octet-stream"), "cache-control": "max-age=3600", "x-upsert": "false" },
        cache: "no-store",
        body: file,
      });
      if (!upload.ok) throw new Error("upload_failed");
      if (!started.upload.finalizeUrl) throw new Error("finalize_missing");
      const finalized = await fetch(started.upload.finalizeUrl, { method: "POST", cache: "no-store" });
      if (!finalized.ok) throw new Error("finalize_failed");
      const value = (await finalized.json()) as {
        evidence: ComunRelataEvidenceState;
      };
      setEvidence(value.evidence);
      setNotice(
        `${started.upload.label} foi guardada privadamente. Metadados foram removidos, mas a imagem ainda exige revisão antes de qualquer uso futuro.`,
      );
    } catch {
      setNotice("A fotografia foi rejeitada ou não pôde ser finalizada. Nenhum arquivo foi publicado.");
      await refresh().catch(() => undefined);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setBusy(false);
    }
  };

  const withdrawPhoto = async (accessUrl: string) => {
    setBusy(true);
    try {
      const response = await fetch(accessUrl, { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("withdraw_failed");
      const value = (await response.json()) as { evidence: ComunRelataEvidenceState };
      setEvidence(value.evidence);
      setNotice("A fotografia foi retirada da interface. A retenção permanece pendente e nenhum delete automático ocorreu.");
    } catch {
      setNotice("Não foi possível retirar a fotografia agora.");
    } finally {
      setBusy(false);
    }
  };

  if (!evidence) {
    return (
      <section aria-live="polite" className="border-2 border-comun-black bg-comun-paper p-4 text-sm font-bold">
        Recuperando evidências privadas…
      </section>
    );
  }

  const summary = [
    locationEnabled && evidence.location !== "not_added" && evidence.location !== "withdrawn"
      ? "Local adicionado"
      : null,
    attachmentsEnabled && evidence.photos.length > 0
      ? `${evidence.photos.length} ${evidence.photos.length === 1 ? "foto adicionada" : "fotos adicionadas"}`
      : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby="relata-evidence-title" className="grid gap-4 border-2 border-comun-black bg-[#f8f2e6] p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-comun-muted">Privado</p>
        <h2 id="relata-evidence-title" className="text-xl font-black">Quer fortalecer este relato?</h2>
        <p className="mt-1 text-sm leading-6">
          {summary.length > 0
            ? summary.join(" · ")
            : "Adicionar local ou foto pode ajudar depois. Tudo continua privado."}
        </p>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="relata-evidence-details"
        onClick={() => setExpanded((value) => !value)}
        className="min-h-11 w-fit border-2 border-comun-black bg-white px-4 py-2 text-sm font-black"
      >
        {expanded ? "Ocultar detalhes" : "Adicionar detalhes"}
      </button>

      {expanded ? <div id="relata-evidence-details" className="grid gap-5">
      {locationEnabled ? <div className="grid gap-3 border-t-2 border-comun-black pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h3 className="font-black">Localização</h3><p className="text-sm">{locationLabel(evidence.location)}</p></div>
          {!withdrawn && evidence.location !== "withdrawn" ? <span className="bg-comun-black px-2 py-1 text-xs font-black text-comun-yellow">Privada</span> : null}
        </div>
        {!withdrawn && evidence.location === "not_added" ? (
          <>
            <p className="text-sm leading-6">Ao escolher uma opção, você autoriza guardar o ponto criptografado. A permissão do aparelho só será pedida depois do toque.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={useDeviceLocation} className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black">Usar localização</button>
              <button type="button" disabled={busy} onClick={() => setShowMap((value) => !value)} className="min-h-11 border-2 border-comun-black bg-white px-3 py-2 text-sm font-black">Marcar no mapa</button>
              <button type="button" disabled={busy} onClick={() => setNotice("Tudo bem. O relato permanece salvo sem localização.")} className="min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black">Pular</button>
            </div>
          </>
        ) : null}
        {showMap && !withdrawn ? (
          <div className="grid gap-3">
            <SidewalkRealPointPicker point={mapPoint} accuracy={null} onChange={setMapPoint} />
            <button type="button" disabled={!mapPoint || busy} onClick={() => mapPoint && void saveLocation(mapPoint[0], mapPoint[1], "map_pin", null)} className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black disabled:opacity-50">Guardar ponto privadamente</button>
          </div>
        ) : null}
      </div> : null}

      {attachmentsEnabled ? <div className="grid gap-3 border-t-2 border-comun-black pt-4">
        <div><h3 className="font-black">Fotografias</h3><p className="text-sm">{evidence.photos.length} de 3 adicionadas</p></div>
        <ul className="grid gap-3">
          {evidence.photos.map((photo) => (
            <li key={photo.accessUrl} className="grid gap-2 border-2 border-comun-black bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><strong>{photo.label}</strong><span className="font-black">{photo.state === "sealed_private" ? "Guardada privadamente" : photo.state === "withdrawn" ? "Retirada" : photo.state === "rejected" ? "Rejeitada" : "Processando"}</span></div>
              {photo.state === "sealed_private" && !withdrawn ? (
                // O proxy exige o cookie HttpOnly no próprio request; next/image não deve intermediar essa prova privada.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.accessUrl} alt={`${photo.label}, evidência privada sem revisão visual`} className="max-h-48 w-full border border-comun-black object-contain" />
              ) : null}
              {photo.state === "sealed_private" && !withdrawn ? <button type="button" disabled={busy} onClick={() => void withdrawPhoto(photo.accessUrl)} className="min-h-11 justify-self-start border-2 border-comun-black px-3 py-2 font-black">Retirar {photo.label.toLowerCase()}</button> : null}
            </li>
          ))}
        </ul>
        {!withdrawn && evidence.photos.length < 3 ? (
          <>
            <p className="text-sm leading-6">Ao adicionar uma foto, você autoriza o armazenamento privado. Remover metadados não comprova ausência de rostos, placas ou residências.</p>
            <input ref={inputRef} id="relata-private-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addPhoto(file); }} />
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="min-h-11 justify-self-start border-2 border-comun-black bg-comun-yellow px-4 py-2 text-sm font-black">Adicionar foto</button>
          </>
        ) : null}
      </div> : null}
      </div> : null}
      {notice ? <p role="status" aria-live="polite" className="border-l-4 border-comun-yellow bg-white p-3 text-sm font-bold">{notice}</p> : null}
      {expanded ? <div className="grid gap-1 border-2 border-comun-black bg-comun-asphalt p-3 font-black text-comun-paper"><p>Nenhum órgão público recebeu esta manifestação.</p><p className="text-comun-yellow">Nada foi publicado no mapa.</p></div> : null}
    </section>
  );
}
