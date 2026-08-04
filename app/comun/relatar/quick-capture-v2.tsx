"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComunShell } from "@/components/comun-shell";
import { DARK_STREET_QUESTION, routeRelata } from "@/lib/comun-relata-routing";
import type { ComunRelataReceipt } from "@/lib/comun-relata-persistence";
import type { RoutingDecision } from "@/lib/comun-relata-contract";

const SidewalkRealPointPicker = dynamic(
  () => import("@/components/sidewalk-real-point-picker").then((module) => module.SidewalkRealPointPicker),
  { ssr: false },
);

const RECEIPT_ENDPOINT = "/api/comun/relata/receipt";
const EVIDENCE_ENDPOINT = "/api/comun/relata/evidence";

function proof() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function durationBucket(start: number) {
  const seconds = (Date.now() - start) / 1000;
  return seconds < 15 ? "under_15s" : seconds <= 30 ? "15_to_30s" : seconds <= 60 ? "31_to_60s" : "over_60s";
}

function labelForState(state: string) {
  return state === "captured_private" ? "Guardado" : state === "withdrawn" ? "Retirado" : "Guardado privadamente";
}

export function QuickCaptureV2() {
  const [startedAt] = useState(() => Date.now());
  const proofRef = useRef<{ idempotencyKey: string; receiptSecret: string } | null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locationMode, setLocationMode] = useState<"skip" | "device" | "map">("skip");
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [answer, setAnswer] = useState<string | undefined>();
  const [receipt, setReceipt] = useState<ComunRelataReceipt | null>(null);
  const [walletRecoveryCode, setWalletRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [interactions, setInteractions] = useState(0);
  const [showMap, setShowMap] = useState(false);

  const sendMetric = (eventType: string, extra: Record<string, unknown> = {}) => {
    void fetch("/api/comun/capture/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType, interactionCount: interactions, durationBucket: durationBucket(startedAt), category: decision?.category, ...extra }),
      keepalive: true,
    }).catch(() => undefined);
  };

  useEffect(() => {
    sendMetric("capture_started");
    fetch(RECEIPT_ENDPOINT, { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as { receipt: ComunRelataReceipt }).receipt : null))
      .then((value) => value && setReceipt(value))
      .catch(() => undefined);
    return () => { if (!receipt) sendMetric("capture_abandoned"); };
    // This is an intentionally single-start telemetry event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsAdaptiveQuestion = useMemo(() => decision?.missingInformation[0] ?? null, [decision]);
  const isEmergency = decision?.urgency === "emergency";

  function updateText(value: string) {
    setText(value);
    const trimmed = value.trim();
    setDecision(trimmed.length >= 8 ? routeRelata({ text: trimmed, hasAttachment: Boolean(photo) }) : null);
    setAnswer(undefined);
    proofRef.current = null;
  }

  function chooseLocation(mode: "device" | "map" | "skip") {
    setInteractions((value) => value + 1);
    setLocationMode(mode);
    if (mode === "skip") { setShowMap(false); return; }
    if (mode === "map") { setShowMap(true); return; }
    if (!navigator.geolocation) { setNotice("Este aparelho não oferece localização. Você pode marcar aproximadamente ou pular."); return; }
    setNotice("A permissão só será pedida agora, depois do seu toque.");
    navigator.geolocation.getCurrentPosition(
      (position) => { setPoint([position.coords.longitude, position.coords.latitude]); setAccuracy(position.coords.accuracy); setShowMap(false); setNotice("Local capturado de forma privada e aproximada."); },
      () => setNotice("Localização não autorizada. O relato continua podendo ser guardado sem local."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }

  async function persistEvidence() {
    if (photo) {
      const start = await fetch(`${EVIDENCE_ENDPOINT}/attachments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: photo.type, sizeBytes: photo.size }) });
      if (!start.ok) throw new Error("photo_start_failed");
      const upload = (await start.json()) as { upload: { url: string; method: "PUT" } };
      const result = await fetch(upload.upload.url, { method: upload.upload.method, headers: { "content-type": photo.type }, body: photo });
      if (!result.ok) throw new Error("photo_upload_failed");
      sendMetric("photo_added");
    }
    if (point && locationMode !== "skip") {
      const result = await fetch(`${EVIDENCE_ENDPOINT}/location`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: point[0], latitude: point[1], origin: locationMode === "device" ? "device" : "map_pin", accuracyMeters: accuracy, capturedAt: new Date().toISOString() }) });
      if (!result.ok) throw new Error("location_failed");
      sendMetric("location_added");
    }
  }

  async function save() {
    if (!decision || needsAdaptiveQuestion || busy) return;
    setBusy(true); setNotice(null);
    try {
      proofRef.current ??= { idempotencyKey: proof(), receiptSecret: proof() };
      const safeText = text.trim().length >= 8 ? text.trim() : "Observação registrada a partir de uma fotografia privada.";
      const response = await fetch("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: safeText, answers: answer ? { homes_power: answer } : {}, hasPhoto: Boolean(photo), captureMode: "quick_v2", idempotencyKey: proofRef.current.idempotencyKey, receiptSecret: proofRef.current.receiptSecret }) });
      if (!response.ok) throw new Error("save_failed");
      const value = (await response.json()) as { receipt: ComunRelataReceipt; walletRecoveryCode?: string };
      setReceipt(value.receipt);
      setWalletRecoveryCode(value.walletRecoveryCode ?? null);
      sessionStorage.setItem("comun_capture_draft_v1", JSON.stringify({ text: safeText, category: value.receipt.category, point, hasPhoto: Boolean(photo) }));
      sendMetric("protocol_issued");
      try { await persistEvidence(); } catch { setNotice("O relato foi guardado. A evidência opcional poderá ser adicionada depois pelo recibo."); }
      sendMetric("capture_completed");
    } catch { setNotice("Não foi possível guardar agora. Nenhum órgão recebeu a manifestação; tente novamente."); sendMetric("capture_error", { errorCode: "save_failed" }); }
    finally { setBusy(false); }
  }

  return (
    <ComunShell showSyntheticNotice={false} appBar={{ title: "Vi um problema", contextLabel: "COMUN Relata" }}>
      <div className="min-h-[calc(100dvh-4rem)] bg-comun-paper px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 text-comun-black sm:px-6">
        <main className="mx-auto grid w-full max-w-2xl gap-5" data-comun-quick-capture-v2="true">
          <header className="grid gap-2"><p className="comun-v2-eyebrow">COMUN Relata</p><h1 className="text-3xl font-black leading-tight sm:text-4xl">Vi um problema</h1><p className="text-base leading-7">Guarde uma frase ou foto em menos de um minuto. O registro é privado e ainda não foi encaminhado.</p></header>
          {!receipt ? <>
            <section className="grid gap-3 border-2 border-comun-black bg-white p-4" aria-labelledby="capture-what"><h2 id="capture-what" className="text-xl font-black">O que você viu?</h2><label htmlFor="capture-text" className="text-sm font-bold">Uma frase curta basta. Não inclua endereço exato, nome ou telefone.</label><textarea id="capture-text" value={text} onChange={(event) => updateText(event.target.value)} rows={4} maxLength={600} className="min-h-28 border-2 border-comun-black p-3 text-base" placeholder="Ex.: a calçada está bloqueada por entulho" /><div className="flex flex-wrap gap-3"><label className="inline-flex min-h-11 cursor-pointer items-center border-2 border-comun-black bg-comun-yellow px-4 py-2 text-sm font-black"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; setPhoto(file); setDecision(file ? routeRelata({ text: text.trim().length >= 8 ? text.trim() : "Observação registrada a partir de uma fotografia privada.", hasAttachment: true }) : null); setInteractions((value) => value + 1); }} />{photo ? `Foto pronta (${Math.round(photo.size / 1024)} KB)` : "Tirar ou escolher foto"}</label></div></section>
            <section className="grid gap-3 border-2 border-comun-black bg-[#f8f2e6] p-4" aria-labelledby="capture-location"><h2 id="capture-location" className="text-xl font-black">Onde foi?</h2><p className="text-sm leading-6">O local é opcional. A coordenada, se usada, fica criptografada e nunca aparece exata no recibo.</p><div className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => chooseLocation("device")} className={`min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black ${locationMode === "device" ? "bg-comun-yellow" : "bg-white"}`}>Usar localização</button><button type="button" onClick={() => chooseLocation("map")} className={`min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black ${locationMode === "map" ? "bg-comun-yellow" : "bg-white"}`}>Marcar aproximadamente</button><button type="button" onClick={() => chooseLocation("skip")} className={`min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black ${locationMode === "skip" ? "bg-comun-yellow" : "bg-white"}`}>Pular</button></div>{showMap ? <div className="grid gap-3"><SidewalkRealPointPicker point={point} accuracy={accuracy} onChange={setPoint} /><p className="text-xs font-bold">Arraste com as setas ou ajuste o ponto aproximado. Não é um mapa público do relato.</p></div> : null}</section>
            {needsAdaptiveQuestion ? <section className="grid gap-3 border-2 border-comun-black bg-white p-4" aria-live="polite"><h2 className="text-xl font-black">Uma confirmação rápida</h2><p className="leading-7">{needsAdaptiveQuestion === DARK_STREET_QUESTION ? DARK_STREET_QUESTION : needsAdaptiveQuestion}</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => { setAnswer("sim"); setInteractions((value) => value + 1); setDecision(routeRelata({ text, answers: { homes_power: "sim" } })); }} className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 py-2 text-left text-sm font-black">Sim</button><button type="button" onClick={() => { setAnswer("nao"); setInteractions((value) => value + 1); setDecision(routeRelata({ text, answers: { homes_power: "nao" } })); }} className="min-h-11 border-2 border-comun-black bg-white px-3 py-2 text-left text-sm font-black">Não sei / não</button></div></section> : null}
            {decision && !needsAdaptiveQuestion ? <section className={`grid gap-4 border-2 border-comun-black p-4 ${isEmergency ? "bg-comun-red text-white" : "bg-comun-asphalt text-comun-paper"}`} aria-live="polite"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-comun-yellow">Próximo passo</p><h2 className="mt-1 text-2xl font-black">{decision.explanation}</h2></div>{isEmergency ? <p className="border-2 border-comun-yellow bg-comun-black p-3 text-sm font-bold">Afaste-se do perigo e procure o serviço de emergência. O COMUN não faz essa chamada.</p> : null}<button type="button" disabled={busy} onClick={save} className="min-h-12 border-2 border-comun-paper bg-comun-yellow px-4 py-3 text-sm font-black text-comun-black">{busy ? "Guardando…" : "Guardar agora"}</button></section> : null}
          </> : <section className="grid gap-4 border-2 border-comun-black bg-white p-4 shadow-[5px_5px_0_#0b0b0a]" aria-live="polite"><p className="text-xs font-black uppercase tracking-[0.14em] text-comun-muted">Status</p><h2 className="text-3xl font-black">{labelForState(receipt.state)}</h2><div className="border-2 border-comun-black bg-comun-yellow p-4"><p className="text-xs font-black uppercase">Protocolo COMUN</p><p className="mt-1 break-all font-mono text-xl font-black">{receipt.protocol}</p></div><p className="border-l-4 border-comun-yellow bg-comun-paper p-3 font-black">Ainda não encaminhado. Nada foi publicado.</p><div className="grid gap-2 sm:grid-cols-2"><Link href="/comun/relatar?modo=detalhado" className="inline-flex min-h-11 items-center justify-center border-2 border-comun-black bg-comun-yellow px-4 py-2 text-sm font-black" onClick={() => { sessionStorage.setItem("comun_capture_draft_v1", JSON.stringify({ text, category: receipt.category, point, hasPhoto: Boolean(photo) })); sendMetric("follow_up_started"); }}>Completar agora</Link><button type="button" onClick={() => sendMetric("capture_completed")} className="min-h-11 border-2 border-comun-black bg-white px-4 py-2 text-sm font-black">Fazer depois</button></div><p className="text-sm leading-6">A foto e a localização são opcionais e privadas. Você pode complementar pelo recibo local.</p></section>}
          {walletRecoveryCode ? <section className="border-2 border-comun-black bg-[#f8f2e6] p-4" aria-live="polite"><p className="text-xs font-black uppercase">Código de recuperação da carteira</p><p className="mt-2 break-all font-mono text-lg font-black tracking-wider">{walletRecoveryCode}</p><p className="mt-2 text-sm">Salve agora. Ele aparece somente neste momento e não está no protocolo.</p></section> : null}
          {notice ? <p role="alert" className="border-l-4 border-comun-red bg-white p-3 text-sm font-bold">{notice}</p> : null}
          <aside className="border-2 border-comun-black bg-comun-asphalt p-4 text-sm leading-6 text-comun-paper"><p className="font-black text-comun-yellow">Sem envio automático</p><p>Nenhum órgão público recebeu esta manifestação. Se houver emergência, cuide primeiro da sua segurança.</p><Link href="/comun/relatar?modo=detalhado" className="mt-3 inline-flex underline">Abrir formulário detalhado</Link></aside>
        </main>
      </div>
    </ComunShell>
  );
}
