import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicPautaSpaces } from "@/lib/pauta-spaces";
import { ComunPautaCard } from "@/components/comun-cards";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { isComunPautasVivasCoreEnabled } from "@/lib/comun-pautas-vivas-feature";
import { PautasVivasIndex } from "@/components/comun-pautas-vivas";
import { resolvePublicOrganizationBridgeFilter } from "@/lib/comun-organization-bridges";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PautaSpacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    experiencia?: string | string[];
    evidencia?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const experience =
    typeof params.experiencia === "string" ? params.experiencia : undefined;
  const appV2 = isComunAppV2(experience);

  if (isComunPautasVivasCoreEnabled()) {
    if (Object.hasOwn(params, "evidencia")) {
      const evidenceFilter =
        typeof params.evidencia === "string"
          ? await resolvePublicOrganizationBridgeFilter(params.evidencia)
          : null;
      return (
        <PautasVivasIndex
          spaces={[]}
          evidenceFilter={
            evidenceFilter
              ? { state: "valid", value: evidenceFilter }
              : { state: "invalid" }
          }
        />
      );
    }
    const spaces = await listPublicPautaSpaces();
    return <PautasVivasIndex spaces={spaces} />;
  }

  const spaces = await listPublicPautaSpaces();

  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Pautas",
          contextLabel: "Processos coletivos",
          backDestination: "/comun/explorar",
        }}
      >
        <ComunCollectionPage
          kind="pauta"
          title="Pautas"
          summary="Problemas coletivos organizados em evidências, decisões, ações e acompanhamento público."
          rail={[
            {
              kind: "territory",
              slug: "territorios",
              title: "Territórios",
              href: "/comun/territorios",
              source: "canonical_route",
            },
            {
              kind: "community",
              slug: "comunidades",
              title: "Comunidades",
              href: "/comun/comunidades",
              source: "canonical_route",
            },
            {
              kind: "result",
              slug: "resultados",
              title: "Resultados",
              href: "/comun/resultados",
              source: "canonical_route",
            },
          ]}
        >
          {spaces.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {spaces.map((space) => (
                <ComunPautaCard
                  key={space.slug}
                  href={withComunAppV2(`/comun/pautas/${space.slug}`)}
                  title={space.title}
                  summary={space.summary ?? "Pauta em organização coletiva."}
                  status={statusLabel(space.status)}
                  nextAction={
                    space.next_step ??
                    "Conhecer o processo e as formas de participação"
                  }
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma pauta pública neste recorte"
              explanation="Pautas aparecem depois de triagem e publicação. Isso não apaga relatos ou processos ainda em revisão."
              related="Você pode explorar territórios, abrir uma ferramenta ou contribuir com uma nova pauta."
              action={{
                href: "/comun/participar",
                label: "Contribuir com pauta",
              }}
              secondaryActions={[
                { href: "/comun/territorios", label: "Explorar territórios" },
                { href: "/comun/calcadas", label: "Abrir Calçadas" },
              ]}
            />
          )}
        </ComunCollectionPage>
      </ComunShell>
    );

  return (
    <ComunShell>
      <Section>
        <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
          Pautas em construcao
        </h1>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
          Pautas sao espacos coletivos para organizar problemas reais,
          evidencias, protocolos, propostas e tarefas. Nao ha feed global, likes
          ou ranking de popularidade.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {spaces.map((space) => (
            <Link
              key={space.slug}
              href={`/comun/pautas/${space.slug}`}
              className="paper-panel border-2 border-comun-black p-5"
            >
              <p className="text-xs font-black uppercase text-comun-asphalt/60">
                {statusLabel(space.status)} /{" "}
                {space.community ?? "comunidade aberta"}
              </p>
              <h2 className="comun-prose mt-2 text-xl font-black uppercase">
                {space.title}
              </h2>
              <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                {space.summary ?? "Pauta em organizacao coletiva."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/70">
                <span>{space.stats.reportCount} relatos</span>
                <span>{space.stats.officialProtocolCount} protocolos</span>
                {space.stats.overdueProtocolCount ? (
                  <span className="text-comun-red">
                    {space.stats.overdueProtocolCount} vencidos
                  </span>
                ) : null}
                <span>{space.stats.openTaskCount} tarefas abertas</span>
              </div>
              <span className="mt-5 inline-flex min-h-10 items-center border-2 border-comun-black bg-comun-yellow px-3 text-sm font-black uppercase">
                Abrir pauta
              </span>
            </Link>
          ))}
          {!spaces.length ? (
            <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
              Ainda nao ha espacos sociais de pauta publicados.
            </p>
          ) : null}
        </div>
      </Section>
    </ComunShell>
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    observing: "Observando",
    organizing: "Organizando",
    drafting: "Sintetizando",
    pressuring: "Cobrando",
    resolved: "Resolvida",
    unresolved: "Nao resolvida",
  };
  return labels[value] ?? value;
}
