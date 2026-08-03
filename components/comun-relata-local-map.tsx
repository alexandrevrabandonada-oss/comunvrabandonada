"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PublicCase = {
  publicId: string; category: string; title: string; summary: string; reportCount: number;
  confirmationCount: number; projectionState: string; location: { latitude: number; longitude: number; uncertaintyRadiusMeters: number };
};

const labels: Record<string, string> = {
  public_lighting: "Iluminação pública",
  power_distribution: "Distribuição de energia",
  smoke_or_environmental_trace: "Vestígio ambiental",
};

export function ComunRelataLocalMap() {
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<PublicCase | null>(null);
  const [message, setMessage] = useState("Carregando casos locais…");
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`/api/comun/relata/public/cases${query}`, { cache: "no-store" });
    if (!response.ok) { setMessage("O mapa local está indisponível neste ambiente."); return; }
    const payload = await response.json() as { cases?: PublicCase[] };
    setCases(payload.cases ?? []);
    setMessage(payload.cases?.length ? "" : "Ainda não há casos elegíveis para esta visualização local.");
  }, [category]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const markers = useMemo(() => cases.map((item) => ({ ...item, x: `${Math.max(4, Math.min(96, ((item.location.longitude + 180) / 360) * 100))}%`, y: `${Math.max(4, Math.min(96, ((90 - item.location.latitude) / 180) * 100))}%` })), [cases]);
  async function confirm(item: PublicCase, undo = false) {
    setConfirming(item.publicId);
    const response = await fetch(`/api/comun/relata/public/cases/${item.publicId}/confirm`, { method: undo ? "DELETE" : "POST" });
    if (response.ok) await load();
    setConfirming(null);
  }

  return <section className="mx-auto max-w-5xl space-y-5 px-4 py-6" aria-labelledby="relata-map-title">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-comun-yellow">Relata · visualização local</p>
      <h1 id="relata-map-title" className="text-3xl font-black tracking-tight">Casos organizados no território</h1>
      <p className="max-w-2xl text-sm text-comun-black/75">Localização aproximada, sem texto, fotos ou protocolo. Nada foi publicado no mapa e nenhum órgão público recebeu esta manifestação.</p>
    </header>
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros do mapa local">
      <label className="text-sm font-semibold" htmlFor="relata-category">Categoria</label>
      <select id="relata-category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-control border-2 border-comun-black bg-comun-paper px-3 text-sm">
        <option value="">Todas</option><option value="public_lighting">Iluminação pública</option><option value="power_distribution">Distribuição de energia</option><option value="smoke_or_environmental_trace">Vestígio ambiental</option>
      </select>
      <div className="ml-auto inline-flex rounded-control border-2 border-comun-black p-1" role="group" aria-label="Modo de visualização">
        <button type="button" className={`min-h-11 rounded-control px-3 text-sm font-bold ${mode === "list" ? "bg-comun-black text-comun-paper" : ""}`} aria-pressed={mode === "list"} onClick={() => setMode("list")}>Lista</button>
        <button type="button" className={`min-h-11 rounded-control px-3 text-sm font-bold ${mode === "map" ? "bg-comun-black text-comun-paper" : ""}`} aria-pressed={mode === "map"} onClick={() => setMode("map")}>Mapa</button>
      </div>
    </div>
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    {mode === "map" && <div className="relative min-h-[24rem] overflow-hidden rounded-card border-2 border-comun-black bg-[#e8ece5]" role="img" aria-label="Mapa local com localizações aproximadas">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(90deg,#9ca79d 1px,transparent 1px),linear-gradient(#9ca79d 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      {markers.map((item) => <button key={item.publicId} type="button" className="absolute z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-comun-black bg-comun-yellow font-black shadow-[3px_3px_0_#111]" style={{ left: item.x, top: item.y }} onClick={() => setSelected(item)} aria-label={`${item.title}, ${item.reportCount} relatos`}>+</button>)}
      <p className="absolute bottom-3 left-3 rounded-control bg-comun-paper/90 px-3 py-2 text-xs font-semibold">Cada marcador representa uma área aproximada; não é um endereço.</p>
    </div>}
    {selected && <article className="rounded-card border-2 border-comun-black bg-comun-paper p-4" aria-label="Detalhe do caso local">
      <h2 className="text-xl font-black">{selected.title}</h2><p className="mt-1 text-sm">{selected.summary}</p>
      <p className="mt-3 text-sm"><strong>{selected.reportCount}</strong> relatos completos · <strong>{selected.confirmationCount}</strong> confirmações comunitárias</p>
      <p className="mt-1 text-xs text-comun-black/70">Área aproximada · raio de incerteza {Math.round(selected.location.uncertaintyRadiusMeters)} m</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void confirm(selected)} disabled={confirming === selected.publicId} className="min-h-11 rounded-control bg-comun-black px-4 text-sm font-bold text-comun-paper">Isso também acontece comigo</button><button type="button" onClick={() => void confirm(selected, true)} disabled={confirming === selected.publicId} className="min-h-11 rounded-control border-2 border-comun-black px-4 text-sm font-bold">Desfazer confirmação</button></div>
    </article>}
    {mode === "list" && <div className="grid gap-3" aria-label="Casos locais">{cases.map((item) => <article key={item.publicId} className="rounded-community border-2 border-comun-black bg-comun-paper p-4"><p className="text-xs font-bold uppercase tracking-wide">{labels[item.category] ?? "Caso organizado"}</p><h2 className="mt-1 text-lg font-black">{item.title}</h2><p className="mt-1 text-sm">{item.summary}</p><p className="mt-3 text-sm"><strong>{item.reportCount}</strong> relatos completos · <strong>{item.confirmationCount}</strong> confirmações comunitárias</p><button type="button" className="mt-3 min-h-11 rounded-control bg-comun-black px-4 text-sm font-bold text-comun-paper" onClick={() => setSelected(item)}>Ver detalhe sanitizado</button></article>)}</div>}
    <footer className="border-t-2 border-comun-black/20 pt-4 text-sm"><a className="font-bold underline" href="/comun/relata">Voltar ao Relata</a> · <span>Prévia local reversível, sem publicação.</span></footer>
  </section>;
}
