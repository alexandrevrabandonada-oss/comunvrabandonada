import {
  resultTypeLabel,
  verificationLabel,
  resultKind,
} from "@/components/comun-result-detail";
import { permanentRedirect } from "next/navigation";
import { getPublicResult, resultMetadata } from "@/lib/comun-public-sharing";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunResultCard } from "@/components/comun-cards";
import { HubCard, EmptyHub } from "@/components/hub-card";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunContextTrail } from "@/components/comun-context-trail";
import { listPublicResults } from "@/lib/central-hub";
import { comunCanonicalRoutes } from "@/lib/comun-canonical-routes";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string; experiencia?: string }>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const [rows, selected] = await Promise.all([
    listPublicResults(),
    params.resultado
      ? getPublicResult(params.resultado)
      : Promise.resolve(null),
  ]);

  if (selected)
    permanentRedirect(
      withComunAppV2(comunCanonicalRoutes.result(selected.slug), appV2),
    );
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Resultados",
          contextLabel: "Prestação de contas",
          backDestination: "/comun/explorar",
        }}
      >
        <ComunCollectionPage
          kind="result"
          title="Resultados"
          summary="Mudanças verificadas, respostas e limites publicados sem confundir promessa com conquista."
          rail={[
            {
              kind: "pauta",
              slug: "pautas",
              title: "Pautas em andamento",
              href: "/comun/pautas",
              source: "canonical_route",
            },
            {
              kind: "protocol",
              slug: "acompanhar",
              title: "Respostas recebidas",
              href: "/comun/acompanhar",
              source: "canonical_route",
            },
            {
              kind: "memory",
              slug: "acervo",
              title: "Memória coletiva",
              href: "/comun/acervo",
              source: "canonical_route",
            },
          ]}
        >
          {rows.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((result: any) => (
                <ComunResultCard
                  key={result.id}
                  href={withComunAppV2(
                    comunCanonicalRoutes.result(result.slug),
                  )}
                  title={result.title}
                  summary={result.public_summary}
                  verification={`${resultTypeLabel(result.result_type)} · ${verificationLabel(result.verification_status)}`}
                  resultKind={resultKind(
                    result.result_type,
                    result.verification_status,
                  )}
                  evidence={result.evidence_summary_public ?? undefined}
                  happenedAt={new Date(result.occurred_at).toLocaleDateString(
                    "pt-BR",
                  )}
                  origin={
                    result.pauta?.title ?? result.action?.title ?? undefined
                  }
                  limitations={result.remaining_public ?? undefined}
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhum resultado verificado publicado"
              explanation="Atividades, protocolos, respostas e promessas não são apresentados como impacto comprovado."
              related="Há processos em andamento que ainda aguardam resposta, evidência ou verificação editorial."
              action={{
                href: "/comun/pautas",
                label: "Ver pautas em andamento",
              }}
              secondaryActions={[
                { href: "/comun/acompanhar", label: "Ver respostas recebidas" },
                { href: "/comun/ajuda", label: "Entender os critérios" },
              ]}
            />
          )}
        </ComunCollectionPage>
      </ComunShell>
    );

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Resultados e prestação de contas
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          O que foi feito, o que mudou e o que ainda falta. Promessa é
          identificada como promessa, nunca como conquista.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((x: any) => (
            <div
              key={x.id}
              id={`resultado-${x.slug}`}
              className={
                params.resultado === x.slug
                  ? "outline outline-4 outline-comun-yellow outline-offset-4"
                  : ""
              }
            >
              <HubCard
                href={comunCanonicalRoutes.result(x.slug)}
                label={`${x.result_type} · ${x.verification_status}`}
                title={x.title}
                summary={x.public_summary}
                meta={new Date(x.occurred_at).toLocaleDateString("pt-BR")}
              />
            </div>
          ))}
        </div>
        {!rows.length ? (
          <EmptyHub>Nenhum resultado público registrado ainda.</EmptyHub>
        ) : null}
      </Section>
    </ComunShell>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const query = await searchParams;
  return query.resultado
    ? resultMetadata(query.resultado)
    : {
        title: "Resultados e prestação de contas | COMUN",
        robots: { index: false, follow: true },
      };
}
