import Link from "next/link";
import { AlertTriangle, Archive, Megaphone, ShieldCheck, type LucideIcon } from "lucide-react";
import { ComunShell, PrimaryLink, Section } from "@/components/comun-shell";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { StatusLabel } from "@/components/status-label";

export default async function ComunHome() {
  const [communities, issues] = await Promise.all([listCommunities(), listIssues()]);

  return (
    <ComunShell>
      <Section className="pb-6 pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="font-black uppercase text-comun-yellow">Relatos, debates e memoria coletiva da cidade.</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] text-comun-paper sm:text-6xl">
              O problema que parece isolado pode ser coletivo.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-comun-paper/82">
              Relate com seguranca, acompanhe outras denuncias e ajude a organizar a memoria popular de Volta Redonda.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryLink href="/comun/relatar">Enviar relato agora</PrimaryLink>
              <p className="max-w-sm text-sm text-comun-paper/70">
                Voce pode relatar de forma anonima. Antes de publicar, removemos dados sensiveis.
              </p>
            </div>
          </div>
          <div className="industrial-border bg-comun-paper p-5 text-comun-black">
            <p className="text-sm font-black uppercase">Relatar. Confirmar. Organizar. Transformar em acao.</p>
            <div className="mt-5 grid gap-3">
              {["Relato bruto fica interno", "Publicacao so com curadoria", "Contato privado nunca e publico"].map((item) => (
                <div key={item} className="flex items-start gap-3 border-2 border-comun-black bg-white/50 p-3">
                  <ShieldCheck className="mt-0.5 text-comun-green" size={20} />
                  <span className="text-sm font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Comunidades iniciais</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {communities.map((community) => (
            <Link key={community.slug} href={`/comun/c/${community.slug}`} className="industrial-border paper-panel block p-4">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center bg-comun-black text-sm font-black text-comun-yellow">
                {community.icon}
              </div>
              <h3 className="font-black uppercase leading-tight">{community.name}</h3>
              <p className="mt-3 text-sm text-comun-asphalt/75">{community.shortDescription}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">Pautas em acompanhamento</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {issues.map((issue) => (
            <Link key={issue.slug} href={`/comun/pautas/${issue.slug}`} className="paper-panel block border-2 border-comun-black p-4">
              <StatusLabel value={issue.status} />
              <h3 className="mt-3 text-xl font-black uppercase">{issue.title}</h3>
              <p className="mt-2 text-sm text-comun-asphalt/75">{issue.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["Voce relata", "Conte do seu jeito, sem cadastro obrigatorio.", Megaphone],
            ["A comunidade confirma", "Relatos parecidos ajudam a revelar padroes.", AlertTriangle],
            ["Vira memoria e acao", "A equipe transforma em pauta, post, dossie ou encaminhamento.", Archive],
          ] satisfies Array<[string, string, LucideIcon]>).map(([title, text, Icon]) => (
            <div key={String(title)} className="border-2 border-comun-yellow bg-comun-black p-5">
              <Icon className="text-comun-yellow" size={28} />
              <h3 className="mt-4 text-xl font-black uppercase">{title}</h3>
              <p className="mt-2 text-sm text-comun-paper/75">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
