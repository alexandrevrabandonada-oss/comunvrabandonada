import { MapPinned } from "lucide-react";
import { ComunShell, Section } from "@/components/comun-shell";
import { HubCard, EmptyHub } from "@/components/hub-card";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { listPublicTerritories } from "@/lib/central-hub";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const rows = await listPublicTerritories();
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Territórios",
          contextLabel: "Onde as pautas acontecem",
          backDestination: "/comun/explorar",
        }}
      >
        <ComunCollectionPage
          kind="territory"
          title="Territórios"
          summary="Municípios, bairros e comunidades onde os processos coletivos acontecem."
          rail={[
            {
              kind: "pauta",
              slug: "pautas",
              title: "Pautas",
              href: "/comun/pautas",
              source: "canonical_route",
            },
            {
              kind: "miniapp",
              slug: "calcadas",
              title: "Calçadas",
              href: "/comun/calcadas",
              source: "canonical_route",
            },
            {
              kind: "community",
              slug: "comunidades",
              title: "Comunidades",
              href: "/comun/comunidades",
              source: "canonical_route",
            },
          ]}
        >
          {rows.length ? (
            <div className="comun-relational-list lg:grid-cols-2">
              {rows.map((territory: any) => (
                <a
                  key={territory.id}
                  href={withComunAppV2(`/comun/territorios/${territory.slug}`)}
                  className="comun-v2-card-memory block p-5"
                >
                  <p className="comun-v2-eyebrow flex items-center gap-2 text-comun-rust">
                    <MapPinned size={16} aria-hidden="true" />{" "}
                    {territory.territory_type}
                  </p>
                  <h2 className="mt-2 text-xl font-black normal-case">
                    {territory.name}
                  </h2>
                  <p className="mt-2 text-sm text-comun-black/70">
                    {territory.public_summary}
                  </p>
                  <span className="mt-4 inline-flex min-h-11 items-center font-black underline">
                    Entrar no território
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Cadastro territorial em preparação"
              explanation="As relações territoriais formais ainda estão sendo revisadas. A atuação em Volta Redonda continua disponível pelas pautas e ferramentas já publicadas."
              related="O vazio representa apenas o cadastro territorial público deste ambiente, não ausência de atuação."
              action={{ href: "/comun/pautas", label: "Ver pautas por cidade" }}
              secondaryActions={[
                { href: "/comun/calcadas", label: "Abrir Calçadas" },
                { href: "/comun/comunidades", label: "Conhecer comunidades" },
              ]}
              icon={<MapPinned />}
            />
          )}
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Territórios
        </h1>
        <p className="mt-3 text-comun-paper/75">
          Municípios, bairros, comunidades e equipamentos onde as pautas
          acontecem.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((x: any) => (
            <HubCard
              key={x.id}
              href={`/comun/territorios/${x.slug}`}
              label={x.territory_type}
              title={x.name}
              summary={x.public_summary}
            />
          ))}
        </div>
        {!rows.length ? (
          <EmptyHub>Nenhum território cadastrado.</EmptyHub>
        ) : null}
      </Section>
    </ComunShell>
  );
}
