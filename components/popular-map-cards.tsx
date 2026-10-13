import Link from "next/link";
import { Section } from "@/components/comun-shell";
export function Hero({ title, text }: { title: string; text: string }) {
  return (
    <Section>
      <p className="font-black uppercase text-comun-yellow">Mapa Popular</p>
      <h1 className="text-4xl font-black uppercase">{title}</h1>
      <p className="mt-3 max-w-3xl">{text}</p>
    </Section>
  );
}
export function Metrics({ rows }: { rows: (string | number)[][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([l, v]) => (
        <div className="paper-panel border-2 p-4" key={String(l)}>
          <b className="text-3xl">{v}</b>
          <p className="text-xs font-black uppercase">{l}</p>
        </div>
      ))}
    </div>
  );
}
export function Card({ x }: { x: any }) {
  return (
    <article className="paper-panel border-2 p-4">
      <p className="text-xs font-black uppercase">{x.verification_status}</p>
      <h2 className="text-xl font-black">{x.name}</h2>
      <p>{x.neighborhood ?? x.municipality}</p>
      <p className="mt-2">{x.public_summary}</p>
      <Link
        className="mt-3 inline-block font-black underline"
        href={`/comun/mapa/${x.slug}`}
      >
        Ver ficha
      </Link>
    </article>
  );
}
export function CTA() {
  return (
    <Link
      className="mt-6 inline-block border-2 bg-comun-yellow px-4 py-3 font-black uppercase text-comun-black"
      href="/comun/mapa/contribuir"
    >
      Informar ou corrigir dado
    </Link>
  );
}
