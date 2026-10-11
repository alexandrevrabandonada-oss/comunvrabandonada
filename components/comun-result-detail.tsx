import { ComunShell } from "@/components/comun-shell";
import { HubCard } from "@/components/hub-card";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunContextTrail } from "@/components/comun-context-trail";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
export function ComunResultDetail({ result }: { result: any }) {
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
      <div
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
      </div>
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

export function resultTypeLabel(value: string) {
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

export function verificationLabel(value: string) {
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

export function resultKind(
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
