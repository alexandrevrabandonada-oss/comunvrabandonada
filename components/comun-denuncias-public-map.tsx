"use client";

import { useEffect, useState } from "react";

type PublicCase = {
  publicId: string;
  category: string;
  title: string;
  summary: string;
  reportCount: number;
  firstObservedDate: string;
  lastActivityDate: string;
  location: { uncertaintyRadiusMeters: number };
};

export function ComunDenunciasPublicMap() {
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [message, setMessage] = useState("Carregando áreas aproximadas…");
  useEffect(() => {
    void fetch("/api/comun/denuncias/mapa/cases", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ cases?: PublicCase[] }> : null)
      .then((payload) => {
        if (!payload) { setMessage("O mapa está indisponível neste momento."); return; }
        setCases(payload.cases ?? []);
        setMessage(payload.cases?.length ? "" : "Ainda não há áreas elegíveis para esta visualização.");
      })
      .catch(() => setMessage("O mapa está indisponível neste momento."));
  }, []);
  return <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-8" aria-labelledby="denuncias-map-title">
    <p className="text-xs font-bold uppercase tracking-[0.18em]">Denúncias e serviços públicos</p>
    <h1 id="denuncias-map-title" className="text-3xl font-black">Mapa de problemas no território</h1>
    <p>Os pontos representam áreas aproximadas onde relatos públicos e seguros indicam um mesmo tipo de problema. Não mostramos endereço, texto original ou quem relatou.</p>
    <p role="status" aria-live="polite">{message}</p>
    <section aria-label="Áreas aproximadas" className="grid gap-3">
      {cases.map((item) => <article key={item.publicId} className="grid gap-2 border-2 border-comun-black bg-comun-paper p-4">
        <h2 className="font-black">{item.title}</h2>
        <p className="text-sm">{item.summary}</p>
        <p className="text-sm">{item.reportCount} relatos públicos elegíveis · área aproximada · incerteza de {Math.round(item.location.uncertaintyRadiusMeters)} m</p>
        <p className="text-xs">Observado entre {item.firstObservedDate} e {item.lastActivityDate}.</p>
      </article>)}
    </section>
  </main>;
}
