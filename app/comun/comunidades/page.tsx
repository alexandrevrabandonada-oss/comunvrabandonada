import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listCommunities } from "@/lib/comun-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunitiesPage() {
  const communities = await listCommunities();

  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Comunidades</h1>
        <p className="comun-prose mt-3 max-w-2xl text-comun-paper/75">Comunidades são casas organizativas persistentes. Dentro delas, pautas transformam questões concretas em etapas, ações, resultados e memória.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {communities.map((community) => (
            <Link
              key={community.slug}
              href={`/comun/c/${community.slug}`}
              className="industrial-border paper-panel flex min-h-[13rem] flex-col p-5"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center bg-comun-black text-sm font-black text-comun-yellow">
                {community.icon}
              </div>
              <h2 className="comun-prose mt-4 text-2xl font-black uppercase">{community.name}</h2>
              <p className="comun-prose mt-3 text-sm text-comun-asphalt/75">{community.fullDescription}</p>
              <p className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm"><strong className="block text-xs uppercase text-comun-concrete">Próxima ação</strong>{community.mainCta}</p>
              <span className="mt-auto inline-flex min-h-11 items-center pt-5 text-sm font-black uppercase text-comun-rust">
                Conhecer comunidade
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
