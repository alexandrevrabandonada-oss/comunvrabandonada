"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

const ways = [
  ["Contar um problema", "/comun/relatar", "5–10 min"],
  ["Entrar numa roda", "/comun/pautas", "10–20 min"],
  ["Ajudar numa ação", "/comun/acoes", "tempo indicado na ação"],
  ["Contribuir com memória", "/comun/acervo/contribuir", "10–30 min"],
] as const;

function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-end bg-comun-black/70 p-0 sm:items-center sm:justify-center sm:p-6" role="presentation" onMouseDown={onClose}><section aria-modal="true" aria-label={title} role="dialog" className="max-h-[82vh] w-full max-w-xl overflow-y-auto border-2 border-comun-black bg-comun-paper p-5 text-comun-black shadow-mural" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-start justify-between gap-4 border-b-2 border-comun-black pb-4"><div><p className="text-xs font-black uppercase text-comun-concrete">COMUN</p><h2 className="text-2xl font-black uppercase leading-none">{title}</h2></div><button type="button" aria-label="Fechar" onClick={onClose} className="grid size-11 place-items-center border-2 border-comun-black"><X aria-hidden="true" /></button></header>{children}</section></div>;
}

export function ParticipateSheet() {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="hidden min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow hover:bg-comun-yellow hover:text-comun-black sm:inline-flex sm:items-center">Participar agora</button><Sheet title="Escolha uma forma de participar" open={open} onClose={() => setOpen(false)}><p className="mt-4 text-sm">Cada caminho informa tempo, cuidado e o que acontece depois. Você pode explorar sem criar conta.</p><ul className="mt-5 divide-y-2 divide-comun-black">{ways.map(([title, href, time]) => <li key={href}><Link href={href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-4 py-4 font-black uppercase hover:text-comun-rust"><span>{title}</span><small className="text-right text-xs normal-case font-bold">{time}</small></Link></li>)}</ul><Link href="/comun/participar" onClick={() => setOpen(false)} className="mt-5 inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">Ver todas as formas</Link></Sheet></>;
}

export function SearchSheet() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return <><button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center text-comun-yellow hover:bg-comun-paper hover:text-comun-black" aria-label="Abrir busca"><Search aria-hidden="true" size={19} /></button><Sheet title="Buscar no COMUN" open={open} onClose={() => setOpen(false)}><form action="/comun/buscar" className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="sr-only" htmlFor="comun-search">Termo de busca</label><input id="comun-search" name="q" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Pauta, território, memória…" className="min-h-12 border-2 border-comun-black bg-white px-3"/><button className="min-h-12 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">Buscar</button></form><p className="mt-4 text-sm">A busca agrupa resultados públicos por processo, território e memória; não há ranking de popularidade.</p></Sheet></>;
}
