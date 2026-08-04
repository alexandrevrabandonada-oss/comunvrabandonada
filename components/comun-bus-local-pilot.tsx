"use client";

import { useMemo, useState } from "react";

type Line = { id: string; publicCode: string; publicName: string };
type Stop = { id: string; publicCode: string | null; publicName: string };
type Timetable = { versionId: string; versionLabel: string; directionId: string; direction: string; destination: string; stopId: string; stop: string; dayType: string; departureTime: string; sourceState: string; sourceReference: string };
type Session = { id: string; state: string; startedAt: string; endedAt?: string; scheduledTime?: string | null; differenceMinutes?: number | null };

function token() {
  const current = sessionStorage.getItem("comun_bus_session_token_v1");
  if (current) return current;
  const value = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  sessionStorage.setItem("comun_bus_session_token_v1", value);
  return value;
}

export function ComunBusLocalPilot({ lines, stops, timetable, observatory, channel }: { lines: Line[]; stops: Stop[]; timetable: Timetable[]; observatory: unknown[]; channel: Record<string, unknown> | null }) {
  const [lineId, setLineId] = useState(lines[0]?.id ?? "");
  const [directionId, setDirectionId] = useState(timetable[0]?.directionId ?? "");
  const [stopId, setStopId] = useState(timetable[0]?.stopId ?? stops[0]?.id ?? "");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("");
  const [problemKind, setProblemKind] = useState("observed_delay");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const choices = useMemo(() => timetable.filter((row) => row.directionId === directionId && row.stopId === stopId), [directionId, stopId, timetable]);
  const selected = choices[0] ?? timetable.find((row) => row.directionId === directionId) ?? timetable[0];
  const directions = useMemo(() => timetable.filter((row, index, all) => all.findIndex((item) => item.directionId === row.directionId) === index), [timetable]);

  async function startWaiting() {
    setStatus("Abrindo sessão com horário do servidor…");
    const response = await fetch("/api/comun/onibus/waiting-sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionToken: token(), lineId, directionId: selected?.directionId ?? directionId, stopId: selected?.stopId ?? stopId, timetableVersionId: selected?.versionId, serviceDate: new Date().toISOString().slice(0, 10), scheduledTime: selected?.departureTime ?? null }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus("Não foi possível iniciar a sessão local.");
    setSession(body.session); setStatus("Sessão iniciada. O horário de início veio do servidor local.");
  }

  async function event(eventType: string) {
    if (!session) return;
    const response = await fetch(`/api/comun/onibus/waiting-sessions/${session.id}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionToken: token(), eventType, observedAt: eventType === "bus_arrived" || eventType === "passed_without_stopping" ? new Date().toISOString() : null }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus("Não foi possível registrar o desfecho.");
    setSession(body.session); setStatus(eventType === "not_observed_during_session" ? "Você não observou o ônibus durante esta sessão." : "Desfecho registrado localmente.");
  }

  async function createRelata() {
    if (!session) return;
    const receiptSecret = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const idempotencyKey = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const response = await fetch(`/api/comun/onibus/waiting-sessions/${session.id}/create-relata`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionToken: token(), receiptSecret, idempotencyKey, problemKind, line: lines.find((line) => line.id === lineId)?.publicName, direction: selected?.direction, stop: selected?.stop, serviceDate: new Date().toISOString().slice(0, 10), officialTime: session.scheduledTime, differenceMinutes: session.differenceMinutes, text: "Observação privada de transporte coletivo." }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus("Não foi possível guardar o relato local.");
    setPreview(body.preview); setStatus(`Relato COMUN guardado: ${body.protocol}. Nada foi enviado à STMU.`);
  }

  return <div className="grid gap-8" data-comun-bus-local="true">
    <section className="border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black" aria-labelledby="bus-question">
      <p className="text-xs font-black uppercase text-comun-concrete">Miniapp local · dados sintéticos</p>
      <h1 id="bus-question" className="mt-2 text-3xl font-black uppercase">O que você precisa agora?</h1>
      <p className="mt-2 max-w-2xl">Consulte uma fonte versionada, registre uma espera e decida o que guardar como observação privada. Nada é enviado para a STMU.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 font-bold">Linha<select className="min-h-11 border-2 border-comun-black p-2" value={lineId} onChange={(event) => setLineId(event.target.value)}>{lines.map((line) => <option key={line.id} value={line.id}>{line.publicCode} · {line.publicName}</option>)}</select></label>
        <label className="grid gap-1 font-bold">Sentido<select className="min-h-11 border-2 border-comun-black p-2" value={directionId} onChange={(event) => setDirectionId(event.target.value)}>{directions.map((row) => <option key={row.directionId} value={row.directionId}>{row.direction} · {row.destination}</option>)}</select></label>
        <label className="grid gap-1 font-bold">Ponto<select className="min-h-11 border-2 border-comun-black p-2" value={stopId} onChange={(event) => setStopId(event.target.value)}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.publicName}</option>)}</select></label>
      </div>
      <div className="mt-4 border-t-2 border-comun-black pt-4"><p className="text-sm font-black uppercase">Horário oficial vigente</p><p className="mt-1 text-xl font-black">{selected ? `${selected.departureTime} · ${selected.versionLabel}` : "Nenhum horário disponível"}</p><p className="text-sm">Fonte: {selected?.sourceReference ?? "sem fonte"}. Tipo de dia: {selected?.dayType ?? "não informado"}.</p></div>
      <button type="button" onClick={startWaiting} className="mt-5 min-h-12 bg-comun-black px-5 font-black uppercase text-comun-paper" disabled={!selected}>Estou esperando</button>
    </section>

    {session ? <section className="border-2 border-comun-yellow p-5" aria-labelledby="bus-session"><h2 id="bus-session" className="text-2xl font-black uppercase text-comun-yellow">Sessão ativa</h2><p className="mt-2">Linha, sentido, ponto e horário previsto ficam vinculados à versão acima. O início foi registrado pelo servidor.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => event("bus_arrived")} className="min-h-12 bg-comun-yellow px-4 font-black uppercase text-comun-black">O ônibus chegou</button><button type="button" onClick={() => event("passed_without_stopping")} className="min-h-12 border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow">Passou sem parar</button><button type="button" onClick={() => event("not_observed_during_session")} className="min-h-12 border-2 border-comun-paper px-4 font-black uppercase">Encerrar espera</button></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="grid gap-1 font-bold">Problema observado<select className="min-h-11 bg-comun-paper p-2 text-comun-black" value={problemKind} onChange={(event) => setProblemKind(event.target.value)}>{["observed_delay","not_observed_during_session","passed_without_stopping","overcrowding","accessibility_failure","vehicle_condition","route_or_timetable_information","staff_conduct_private"].map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={createRelata} className="min-h-12 self-end bg-comun-paper px-4 font-black uppercase text-comun-black">Guardar como relato no COMUN</button></div></section> : null}

    <section className="grid gap-4 md:grid-cols-2" aria-labelledby="bus-observatory"><div className="border-2 border-comun-paper/40 p-5"><h2 id="bus-observatory" className="text-xl font-black uppercase text-comun-yellow">Observatório local</h2><p className="mt-2 text-sm text-comun-paper/75">Amostra sintética/local, sem inferir que uma viagem ocorreu ou deixou de ocorrer.</p>{observatory.length ? <ul className="mt-4 grid gap-2">{observatory.slice(0, 5).map((item: any) => <li key={item.id} className="border-t border-comun-paper/30 pt-2 text-sm">{item.periodStart} → {item.periodEnd} · amostra {item.sampleSize}</li>)}</ul> : <p className="mt-4 text-sm">Ainda não há agregados locais suficientes.</p>}</div><div className="border-2 border-comun-paper/40 p-5"><h2 className="text-xl font-black uppercase text-comun-yellow">Canal candidato</h2><p className="mt-2 text-sm">{typeof channel?.label === "string" ? channel.label : "WhatsApp de Ônibus — STMU"}</p><p className="mt-2 text-sm text-comun-paper/75">Fonte oficial e operação ainda não verificadas. Não há link, envio ou protocolo externo.</p><p className="mt-4 font-black uppercase text-comun-yellow">Esta mensagem ainda não foi enviada à STMU.</p></div></section>
    <p role="status" aria-live="polite" className="min-h-6 text-sm text-comun-yellow">{status}</p>
    {preview ? <section className="border-2 border-comun-yellow bg-comun-yellow p-5 text-comun-black" aria-live="polite"><h2 className="text-xl font-black uppercase">Prévia local do relato</h2><p className="mt-2">Protocolo COMUN: {String(preview.protocol ?? "gerado")}</p><p className="mt-1 font-black">Esta mensagem ainda não foi enviada à STMU.</p></section> : null}
  </div>;
}
