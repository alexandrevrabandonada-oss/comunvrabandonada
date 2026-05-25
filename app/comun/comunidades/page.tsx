import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listCommunities } from "@/lib/comun-data";

export default async function CommunitiesPage() {
  const communities = await listCommunities();

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">Comunidades</h1>
        <p className="mt-3 max-w-2xl text-comun-paper/75">Cada comunidade organiza relatos de um tipo de problema para virar pauta, memoria e acao publica.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {communities.map((community) => (
            <Link key={community.slug} href={`/comun/c/${community.slug}`} className="industrial-border paper-panel block p-5">
              <h2 className="text-2xl font-black uppercase">{community.name}</h2>
              <p className="mt-3 text-comun-asphalt/75">{community.fullDescription}</p>
              <span className="mt-5 inline-flex min-h-11 items-center bg-comun-yellow px-4 text-sm font-black uppercase">Abrir comunidade</span>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
