"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ComunRelataReceipt } from "@/lib/comun-relata-persistence";
import {
  COMUN_BUS_ISSUE_LABELS,
  COMUN_BUS_ISSUE_TYPES,
  type ComunBusIssueType,
} from "@/lib/comun-bus-p5-contract";

const SidewalkRealPointPicker = dynamic(
  () => import("@/components/sidewalk-real-point-picker").then((module) => module.SidewalkRealPointPicker),
  { ssr: false },
);

function proof() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function localDateTime() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export function ComunBusRelataIntake({ attachmentsEnabled, locationEnabled }: { attachmentsEnabled: boolean; locationEnabled: boolean }) {
  const proofs = useRef<{ idempotencyKey: string; receiptSecret: string } | null>(null);
  const [issueType, setIssueType] = useState<ComunBusIssueType>("delay_or_not_passed");
  const [lineLabel, setLineLabel] = useState("");
  const [direction, setDirection] = useState("");
  const [vehicleOrder, setVehicleOrder] = useState("");
  const [observedAt, setObservedAt] = useState(localDateTime());
  const [waitMinutes, setWaitMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locationMode, setLocationMode] = useState<"device" | "map" | null>(null);
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ComunRelataReceipt | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  function useDeviceLocation() {
    setLocationMode("device");
    if (!navigator.geolocation) return setNotice("Este aparelho não oferece localização. Você pode marcar aproximadamente.");
    navigator.geolocation.getCurrentPosition(
      (position) => { setPoint([position.coords.longitude, position.coords.latitude]); setAccuracy(position.coords.accuracy); setNotice("Local pronto para ser guardado de forma privada."); },
      () => { setPoint(null); setNotice("Localização recusada. O relato pode ser guardado sem ela."); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function persistPhoto(file: File) {
    const start = await fetch("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }) });
    if (!start.ok) throw new Error("photo_start_failed");
    const value = (await start.json()) as { upload: { url: string; method: "PUT"; contentType: string; finalizeUrl: string } };
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const upload = await fetch(value.upload.url, { method: value.upload.method, headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": value.upload.contentType, "cache-control": "max-age=3600", "x-upsert": "false" }, body: file });
    if (!upload.ok) throw new Error("photo_upload_failed");
    const finalized = await fetch(value.upload.finalizeUrl, { method: "POST", cache: "no-store" });
    if (!finalized.ok) throw new Error("photo_finalize_failed");
  }

  async function save() {
    if (busy) return;
    setBusy(true); setNotice(null);
    try {
      proofs.current ??= { idempotencyKey: proof(), receiptSecret: proof() };
      const response = await fetch("/api/comun/onibus/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ issueType, lineLabel, direction, vehicleOrder, observedAt: new Date(observedAt).toISOString(), waitMinutes, description, ...proofs.current }) });
      if (!response.ok) throw new Error("intake_failed");
      const value = (await response.json()) as { receipt: ComunRelataReceipt; intakeReady: boolean; walletRecoveryCode?: string };
      setReceipt(value.receipt); setRecoveryCode(value.walletRecoveryCode ?? null);
      const failures: string[] = [];
      if (!value.intakeReady) failures.push("a ficha de Ônibus");
      if (photo) { try { await persistPhoto(photo); } catch { failures.push("a foto"); } }
      if (point && locationMode) {
        const location = await fetch("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: point[0], latitude: point[1], origin: locationMode === "device" ? "device" : "map_pin", accuracyMeters: accuracy, capturedAt: new Date().toISOString() }) });
        if (!location.ok) failures.push("a localização");
      }
      if (failures.length) setNotice(`O relato foi guardado, mas não foi possível adicionar ${failures.join(" e ")}. Você pode completar depois.`);
    } catch { setNotice("Não foi possível guardar agora. Nenhum órgão recebeu e nada foi publicado."); }
    finally { setBusy(false); }
  }

  if (receipt) return <main className="mx-auto grid max-w-2xl gap-5 px-4 py-8" data-comun-bus-p5="receipt">
    <p className="comun-v2-eyebrow">Ônibus</p><h1 className="text-4xl font-black">Guardado no COMUN</h1>
    <section className="border-2 bg-comun-yellow p-4"><p className="text-xs font-black uppercase">Protocolo COMUN</p><p className="break-all font-mono text-xl font-black">{receipt.protocol}</p></section>
    <p className="font-bold">Ainda não encaminhado. Nada foi publicado automaticamente.</p>
    {notice ? <p role="alert" className="border-l-4 border-comun-red bg-white p-3">{notice}</p> : null}
    <div className="flex flex-wrap gap-3"><Link className="btn" href="/comun/minha-participacao">Ver na Carteira</Link><Link className="btn" href="/comun/onibus">Registrar outro</Link></div>
    {recoveryCode ? <section className="border-2 bg-white p-4"><b>Código de recuperação da Carteira</b><p className="mt-2 break-all font-mono">{recoveryCode}</p><small>Salve agora. Ele aparece somente neste momento.</small></section> : null}
  </main>;

  return <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8" data-comun-bus-p5="intake">
    <header><p className="comun-v2-eyebrow">COMUN Ônibus</p><h1 className="text-4xl font-black">Registrar problema no ônibus</h1><p className="mt-2">Guarde o relato de forma privada. O COMUN não envia nada à STMU automaticamente.</p></header>
    <fieldset className="grid gap-3 border-2 bg-white p-4"><legend className="px-1 text-xl font-black">Tipo de problema</legend><div className="grid gap-2 sm:grid-cols-2">{COMUN_BUS_ISSUE_TYPES.map((value) => <button key={value} type="button" aria-pressed={issueType === value} onClick={() => setIssueType(value)} className={`min-h-11 border-2 px-3 py-2 text-left font-bold ${issueType === value ? "bg-comun-yellow" : "bg-white"}`}>{COMUN_BUS_ISSUE_LABELS[value]}</button>)}</div></fieldset>
    <section className="grid gap-3 border-2 bg-white p-4"><h2 className="text-xl font-black">Contexto opcional</h2>
      <label className="grid gap-1 font-bold">Linha<input value={lineLabel} onChange={(e) => setLineLabel(e.target.value)} maxLength={80} className="min-h-11 border-2 p-3 font-normal" placeholder="Informe ou deixe em branco se não souber" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 font-bold">Sentido<input value={direction} onChange={(e) => setDirection(e.target.value)} maxLength={80} className="min-h-11 border-2 p-3 font-normal" /></label><label className="grid gap-1 font-bold">Número de ordem/veículo<input value={vehicleOrder} onChange={(e) => setVehicleOrder(e.target.value)} maxLength={80} className="min-h-11 border-2 p-3 font-normal" /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 font-bold">Horário observado<input type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} className="min-h-11 border-2 p-3 font-normal" /></label><label className="grid gap-1 font-bold">Tempo de espera (minutos)<input type="number" min="0" max="720" value={waitMinutes} onChange={(e) => setWaitMinutes(e.target.value)} className="min-h-11 border-2 p-3 font-normal" /></label></div>
      <label className="grid gap-1 font-bold">Descrição opcional<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="min-h-24 border-2 p-3 font-normal" placeholder="Não inclua nome de trabalhador, telefone ou endereço residencial." /></label>
    </section>
    {attachmentsEnabled ? <label className="inline-flex min-h-12 cursor-pointer items-center justify-center border-2 bg-comun-yellow px-4 font-black"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />{photo ? `Foto privada pronta (${Math.round(photo.size / 1024)} KB)` : "Tirar ou escolher foto (opcional)"}</label> : null}
    {locationEnabled ? <section className="grid gap-3 border-2 bg-white p-4"><h2 className="text-xl font-black">Local opcional</h2><p>A coordenada fica criptografada e não aparece na Carteira.</p><div className="grid gap-2 sm:grid-cols-3"><button type="button" className="btn" onClick={useDeviceLocation}>Usar localização</button><button type="button" className="btn" onClick={() => setLocationMode("map")}>Marcar aproximadamente</button><button type="button" className="btn" onClick={() => { setLocationMode(null); setPoint(null); setAccuracy(null); }}>Pular</button></div>{locationMode === "map" ? <SidewalkRealPointPicker point={point} accuracy={accuracy} onChange={(value) => { setPoint(value); setAccuracy(null); }} /> : null}{point ? <p className="text-sm font-bold">Local selecionado privadamente.</p> : null}</section> : null}
    <button type="button" disabled={busy} onClick={save} className="min-h-12 border-2 bg-comun-yellow px-5 py-3 font-black shadow-[4px_4px_0_#0b0b0a]">{busy ? "Guardando…" : "Guardar relato"}</button>
    {notice ? <p role="alert" className="border-l-4 border-comun-red bg-white p-3 font-bold">{notice}</p> : null}
    <aside className="border-2 bg-comun-asphalt p-4 text-comun-paper"><b className="text-comun-yellow">Privado por padrão</b><p>Nenhum órgão será acionado e nenhuma informação será publicada automaticamente.</p></aside>
  </main>;
}
