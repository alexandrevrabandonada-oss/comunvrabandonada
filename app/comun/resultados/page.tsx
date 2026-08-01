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
import { getPublicResult, listPublicResults } from "@/lib/central-hub";
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
    appV2 && params.resultado
      ? getPublicResult(params.resultado)
      : Promise.resolve(null),
  ]);

  if (appV2 && selected) return <ResultDetail result={selected} />;
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

function ResultDetail({ result }: { result: any }) {
  const relations: EntityRelation[] = [
    ...(result.pauta
      ? [
          {
            ...entityReference("pauta", result.pauta.slug, result.pauta.title),
            source: "foreign_key" as const,
          },
        ]
      : []),
    ...(result.action
      ? [
          {
            ...entityReference(
              "action",
              result.action.slug,
              result.action.title,
            ),
            source: "foreign_key" as const,
          },
        ]
      : []),
    ...(result.territory
      ? [
          {
            ...entityReference(
              "territory",
              result.territory.slug,
              result.territory.name,
            ),
            source: "foreign_key" as const,
          },
        ]
      : []),
    ...result.memory.map((item: any) => ({
      ...entityReference("memory", item.archive.slug, item.archive.title),
      source: "junction" as const,
    })),
  ];
  const context = createComunEntityContext({
    kind: "result",
    id: result.id,
    slug: result.slug,
    title: result.title,
    state: verificationLabel(result.verification_status),
    summary: result.public_summary,
    territory: result.territory
      ? entityReference(
          "territory",
          result.territory.slug,
          result.territory.name,
        )
      : undefined,
    pauta: result.pauta
      ? entityReference("pauta", result.pauta.slug, result.pauta.title)
      : undefined,
    primaryAction: {
      href: result.pauta
        ? `/comun/pautas/${result.pauta.slug}`
        : "/comun/pautas",
      label: result.pauta ? "Voltar à pauta" : "Ver pautas",
      description: "Consulte a origem e a continuidade deste resultado.",
    },
    relations,
  });
  return (
    <ComunShell
      appBar={{
        title: result.title,
        contextLabel: "Resultado · prestação de contas",
        backDestination: "/comun/resultados",
      }}
    >
      <main
        className="comun-v2-page comun-v2-page--reading comun-relational-page"
        data-comun-app-v2-page="result-detail"
      >
        <ComunContextTrail
          items={[
            ...(result.territory
              ? [
                  {
                    kind: "território" as const,
                    label: result.territory.name,
                    href: withComunAppV2(
                      `/comun/territorios/${result.territory.slug}`,
                    ),
                  },
                ]
              : []),
            ...(result.pauta
              ? [
                  {
                    kind: "pauta" as const,
                    label: result.pauta.title,
                    href: withComunAppV2(`/comun/pautas/${result.pauta.slug}`),
                  },
                ]
              : []),
            { kind: "entidade", label: result.title },
          ]}
        />
        <ComunEntityHeader context={context} />
        <ComunRelationRail relations={relations} />
        <ComunRelatedSection title="Evidência e limites">
          <dl className="surface-result grid gap-4 rounded-[var(--comun-radius-card)] p-5 text-comun-black">
            <Row
              label="Classificação"
              value={resultTypeLabel(result.result_type)}
            />
            <Row
              label="O que foi feito"
              value={
                result.what_was_done_public ?? "Não detalhado na publicação."
              }
            />
            <Row
              label="Evidência pública"
              value={
                result.evidence_summary_public ??
                "Evidência ainda não descrita publicamente."
              }
            />
            <Row
              label="Limitações e continuidade"
              value={result.remaining_public ?? "Limitações não descritas."}
            />
            <Row
              label="Data de referência"
              value={new Date(result.occurred_at).toLocaleDateString("pt-BR")}
            />
          </dl>
        </ComunRelatedSection>
        <ComunRelatedSection title="Memória relacionada">
          {result.memory.length ? (
            <div className="grid gap-3">
              {result.memory.map((item: any) => (
                <a
                  key={item.archive.slug}
                  className="min-h-11 font-black underline"
                  href={withComunAppV2(`/comun/acervo/${item.archive.slug}`)}
                >
                  {item.archive.title}
                </a>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Memória relacionada ainda não publicada"
              explanation="A preservação aparece aqui somente quando existe vínculo editorial público com este resultado."
              action={{ href: "/comun/acervo", label: "Explorar o Acervo" }}
            />
          )}
        </ComunRelatedSection>
      </main>
    </ComunShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="comun-v2-eyebrow text-comun-black/60">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function resultTypeLabel(value: string) {
  return (
    (
      {
        achievement: "Conquista",
        official_response: "Resposta recebida",
        partial_change: "Mudança parcial",
        promise: "Promessa",
        work_started: "Atividade iniciada",
        policy_changed: "Política alterada",
        problem_solved: "Problema resolvido",
        no_response: "Sem resposta",
        setback: "Retrocesso",
        learning: "Aprendizado",
      } as Record<string, string>
    )[value] ?? value
  );
}

function verificationLabel(value: string) {
  return (
    (
      {
        pending: "Aguardando verificação",
        verified: "Verificado",
        disputed: "Em contestação",
        superseded: "Substituído",
      } as Record<string, string>
    )[value] ?? value
  );
}

function resultKind(
  type: string,
  verification: string,
):
  | "Atividade realizada"
  | "Resposta recebida"
  | "Resultado verificado"
  | "Impacto ainda não comprovado" {
  if (verification !== "verified" || type === "promise")
    return "Impacto ainda não comprovado";
  if (type === "official_response") return "Resposta recebida";
  if (type === "work_started" || type === "learning")
    return "Atividade realizada";
  return "Resultado verificado";
}
