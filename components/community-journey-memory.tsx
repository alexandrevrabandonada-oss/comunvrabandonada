"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

type JourneyMemory = { href: string; label: string; context?: string; savedAt: string };
const key = "comun:journey:v1";

function isSafeMemory(value: unknown): value is JourneyMemory {
  if (!value || typeof value !== "object") return false;
  const memory = value as JourneyMemory;
  return typeof memory.href === "string" && memory.href.startsWith("/comun/") && !memory.href.startsWith("/comun/admin") && typeof memory.label === "string" && memory.label.length <= 120;
}

export function RememberJourney({ href, label, context }: { href: string; label: string; context?: string }) {
  useEffect(() => {
    if (!isSafeMemory({ href, label, context, savedAt: new Date().toISOString() })) return;
    localStorage.setItem(key, JSON.stringify({ href, label, context: context?.slice(0, 120), savedAt: new Date().toISOString() }));
  }, [context, href, label]);
  return null;
}

export function ResumeJourneySection() {
  const [memory, setMemory] = useState<JourneyMemory | null>(null);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      if (isSafeMemory(value)) queueMicrotask(() => setMemory(value));
    } catch { localStorage.removeItem(key); }
  }, []);
  if (!memory) return null;
  return <section className="mx-auto max-w-7xl px-4 py-6"><div className="grid border-2 border-comun-paper/35 bg-comun-paper text-comun-black sm:grid-cols-[4.5rem_1fr_auto]"><div className="grid min-h-16 place-items-center border-b-2 border-comun-black bg-comun-yellow sm:border-b-0 sm:border-r-2"><Clock3 aria-hidden="true"/></div><div className="p-4"><p className="text-xs font-black uppercase text-comun-concrete">Continue de onde parou</p><h2 className="mt-1 text-xl font-black uppercase">{memory.label}</h2>{memory.context ? <p className="mt-1 text-sm text-comun-asphalt/70">{memory.context}</p> : null}</div><Link href={memory.href} className="m-3 inline-flex min-h-11 items-center justify-center gap-2 bg-comun-black px-4 font-black uppercase text-comun-paper">Retomar <ArrowRight size={18}/></Link></div></section>;
}
