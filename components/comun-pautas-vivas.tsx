import Link from "next/link";
import { ComunShell, PrimaryLink, Section } from "./comun-shell";
import type {
  PublicPautaSpace,
  PublicPautaEvidenceItem,
  PublicPautaTask,
  PublicPautaContribution,
} from "@/lib/pauta-spaces";
import type { PublishedPautaDossierSnapshot } from "@/lib/pauta-dossiers";
import { isPublicEvidenceCitationV1 } from "@/lib/comun-public-evidence";
import type { PublicRodaV1 } from "@/lib/comun-rodas-vivas";
import type { PublicCollectiveActionSummaryV1 } from "@/lib/comun-collective-actions-canonical";
import { PautaCollectiveActions } from "./comun-collective-actions-canonical";
import { PautaCycleMemory } from "./comun-pauta-cycle-memory";
import type { PublicPautaCycleMemoryV1 } from "@/lib/comun-pauta-cycle-memory";
import type { PublicOrganizationBridgeFilterV1 } from "@/lib/comun-organization-bridges";
import { ComunPautaCreationDraftClear } from "./comun-pauta-creation-draft-clear";

export type PublicPautaEvidenceFilterStateV1 =
  | { state: "valid"; value: PublicOrganizationBridgeFilterV1 }
  | { state: "invalid" };

export function PautasVivasIndex({
  spaces,
  evidenceFilter,
  creationEnabled = false,
}: {
  spaces: readonly PublicPautaSpace[];
  evidenceFilter?: PublicPautaEvidenceFilterStateV1;
  creationEnabled?: boolean;
}) {
  if (evidenceFilter) {
    return <EvidenceFilteredPautasIndex filter={evidenceFilter} creationEnabled={creationEnabled} />;
  }
  const ordered = [...spaces].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
  return (
    <div data-comun-app-v2-page="pautas-vivas-collection">
      <ComunShell>
        <Section>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">
            Organização coletiva
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
            Pautas Vivas
          </h1>
          <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
            Espaços duráveis para entender um problema ou uma proposta, reunir
            evidências públicas e acompanhar próximos passos.
          </p>
          {creationEnabled ? (
            <Link
              href="/comun/pautas/nova"
              className="mt-5 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
            >
              Começar uma pauta
            </Link>
          ) : null}
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {ordered.map((space) => (
              <article
                key={space.id}
                className="paper-panel flex flex-col border-2 border-comun-black p-5"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/70">
                  {publicState(space)}
                </p>
                <h2 className="comun-prose mt-2 text-xl font-black uppercase">
                  {space.title}
                </h2>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {primaryQuestion(space)}
                </p>
                <p className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">
                  <strong>Próximo passo:</strong>{" "}
                  {space.next_step ??
                    "Conhecer a pauta e suas formas de participação."}
                </p>
                <Link
                  href={`/comun/pautas/${space.slug}`}
                  className="mt-5 inline-flex min-h-11 w-fit items-center border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase"
                >
                  Acompanhar pauta
                </Link>
              </article>
            ))}
            {!ordered.length ? (
              <div>
                <Empty text="Ainda não há Pautas Vivas públicas neste momento. Isso não significa que não existam questões coletivas em Volta Redonda." />
                <Link
                  href="/comun/observatorios/panorama"
                  className="mt-4 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
                >
                  Enquanto isso, entender o que os dados mostram
                </Link>
              </div>
            ) : null}
          </div>
          <p className="mt-5 max-w-3xl text-sm text-comun-paper/65">
            A ordem segue a atualização pública mais recente.{" "}
            {"Não há ranking de popularidade."}
          </p>
        </Section>
      </ComunShell>
    </div>
  );
}

function EvidenceFilteredPautasIndex({
  filter,
  creationEnabled,
}: {
  filter: PublicPautaEvidenceFilterStateV1;
  creationEnabled: boolean;
}) {
  if (filter.state === "invalid") {
    return (
      <div data-comun-app-v2-page="pautas-vivas-evidence-filter-invalid">
        <ComunShell>
          <Section>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">
              Organização coletiva
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
              Esta referência pública não está disponível.
            </h1>
            <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
              O recorte falhou fechado e nenhuma associação foi inferida por
              texto, categoria ou semelhança.
            </p>
            <Link
              href="/comun/pautas"
              className="mt-6 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
            >
              Ver todas as pautas
            </Link>
          </Section>
        </ComunShell>
      </div>
    );
  }

  const { citation, bridge } = filter.value;
  return (
    <div data-comun-app-v2-page="pautas-vivas-evidence-filter">
      <ComunShell>
        <Section>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">
            Organização coletiva
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
            Pautas relacionadas a esta evidência
          </h1>
          <div className="mt-5 max-w-3xl border-l-4 border-comun-yellow pl-4">
            <p className="text-xs font-black uppercase text-comun-paper/65">
              {evidenceBadge(citation.sourceKind, citation.claimKind)}
            </p>
            <h2 className="comun-prose mt-1 text-xl font-black">
              {citation.title}
            </h2>
            <p className="comun-prose mt-1 text-sm text-comun-paper/75">
              Período: {citation.referencePeriod}
            </p>
            <Link
              href={citation.publicPath}
              className="mt-3 inline-flex min-h-10 items-center font-black underline decoration-2 underline-offset-4"
            >
              Ver fonte no COMUN
            </Link>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {bridge.pautas.map((pauta) => (
              <article
                key={pauta.pautaId}
                className="paper-panel flex flex-col border-2 border-comun-black p-5"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/70">
                  {pauta.publicStatus}
                </p>
                <h2 className="comun-prose mt-2 text-xl font-black uppercase">
                  {pauta.title}
                </h2>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {pauta.summary ?? "Pauta pública ligada a esta evidência."}
                </p>
                <p className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">
                  <strong>Próximo passo:</strong>{" "}
                  {pauta.nextStep ??
                    "Conhecer a pauta e suas formas de participação."}
                </p>
                {pauta.relationVersionState === "historical_version" ? (
                  <p className="mt-3 text-xs text-comun-asphalt/65">
                    Esta pauta possui uma versão anterior desta evidência.
                  </p>
                ) : null}
                <Link
                  href={`/comun/pautas/${pauta.slug}`}
                  className="mt-5 inline-flex min-h-11 w-fit items-center border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase"
                >
                  Acompanhar pauta
                </Link>
              </article>
            ))}
            {!bridge.pautas.length ? (
              <div>
                <Empty text="Ainda não há pauta pública ligada a esta evidência." />
                {creationEnabled ? (
                  <Link
                    href={`/comun/pautas/nova?evidencia=${encodeURIComponent(citation.refId)}`}
                    className="mt-4 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
                  >
                    Começar uma pauta sobre isso
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          <Link
            href="/comun/pautas"
            className="mt-6 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
          >
            Ver todas as pautas
          </Link>
        </Section>
      </ComunShell>
    </div>
  );
}

export function PautaVivaDetail({
  space,
  evidence,
  tasks,
  contributions,
  dossiers,
  rodas = [],
  rodasEnabled = false,
  collectiveActions = [],
  collectiveActionsEnabled = false,
  cycleMemory = null,
  cycleMemoryEnabled = false,
  creationFeedback,
}: {
  space: PublicPautaSpace;
  evidence: readonly PublicPautaEvidenceItem[];
  tasks: readonly PublicPautaTask[];
  contributions: readonly PublicPautaContribution[];
  dossiers: readonly PublishedPautaDossierSnapshot[];
  rodas?: readonly PublicRodaV1[];
  rodasEnabled?: boolean;
  collectiveActions?: readonly PublicCollectiveActionSummaryV1[];
  collectiveActionsEnabled?: boolean;
  cycleMemory?: PublicPautaCycleMemoryV1 | null;
  cycleMemoryEnabled?: boolean;
  creationFeedback?: { created: boolean; evidenceAdded: boolean };
}) {
  const openRodas = rodas.filter((roda) => roda.status === "open");
  const hasOpenRoda = openRodas.length > 0;
  const activeActions = collectiveActions.filter(
    (action) => action.status === "open" || action.status === "active",
  );
  const memoryIsPrimary =
    cycleMemoryEnabled && cycleMemory?.currentState === "concluded";
  const primaryHref = memoryIsPrimary
    ? "#historia"
    : openRodas.length === 1
      ? `/comun/pautas/${space.slug}/rodas/${openRodas[0].id}`
      : hasOpenRoda
        ? "#rodas-vivas"
        : activeActions.length === 1
          ? `/comun/acoes/${activeActions[0].slug}`
          : activeActions.length > 1
            ? "#acoes-desta-pauta"
            : "/comun/participar";
  const primaryLabel = memoryIsPrimary
    ? "Ler o que aconteceu"
    : openRodas.length === 1
      ? "Entrar na roda"
      : hasOpenRoda
        ? "Ver rodas abertas"
        : activeActions.length === 1
          ? "Participar da ação"
          : activeActions.length > 1
            ? "Ver ações abertas"
            : "Participar desta pauta";
  return (
    <ComunShell>
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <Link
          href="/comun/pautas"
          className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4"
        >
          ← Pautas Vivas
        </Link>
      </div>
      {creationFeedback?.created ? (
        <div className="mx-auto mt-4 max-w-7xl px-4" role="status">
          <ComunPautaCreationDraftClear />
          <div className="border-2 border-comun-yellow bg-comun-black p-4 text-comun-paper">
            <p className="font-black">Pauta criada.</p>
            <p className="mt-1 text-sm">Você já está acompanhando esta pauta.</p>
            {creationFeedback.evidenceAdded ? <p className="mt-1 text-sm">A evidência pública foi adicionada como contexto.</p> : null}
          </div>
        </div>
      ) : null}
      <Section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">
          Pauta Viva · {publicState(space)}
        </p>
        <h1 className="comun-prose mt-2 max-w-4xl text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
          {space.title}
        </h1>
        <h2 className="comun-prose mt-5 max-w-4xl text-xl font-black text-comun-paper">
          {primaryQuestion(space)}
        </h2>
        <div className="mt-6 max-w-4xl border-l-4 border-comun-yellow pl-4">
          <p className="text-xs font-black uppercase text-comun-paper/60">
            Próximo passo
          </p>
          <p className="comun-prose mt-1 text-comun-paper/85">
            {space.next_step ?? "Conhecer a pauta e escolher como participar."}
          </p>
        </div>
        <div className="mt-6">
          <PrimaryLink href={primaryHref}>{primaryLabel}</PrimaryLink>
        </div>
      </Section>

      {memoryIsPrimary && cycleMemory ? (
        <PautaCycleMemory memory={cycleMemory} primary />
      ) : null}

      {rodasEnabled ? (
        <Section>
          <div id="rodas-vivas" />
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            {hasOpenRoda ? "Roda aberta agora" : "Rodas em andamento"}
          </h2>
          <p className="comun-prose mt-2 max-w-3xl text-comun-paper/75">
            Conversas organizadas em etapas para construir entendimento, síntese
            e próximos passos.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {rodas.map((roda) => (
              <article
                key={roda.id}
                className="paper-panel flex flex-col border-2 border-comun-black p-5"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/70">
                  {roda.status === "open"
                    ? "Aberta para acompanhar"
                    : "Em andamento"}
                </p>
                <h3 className="comun-prose mt-2 text-xl font-black uppercase">
                  {roda.title}
                </h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/80">
                  {roda.publicQuestion}
                </p>
                {roda.currentRound ? (
                  <p className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/80">
                    <strong>Rodada atual:</strong> {roda.currentRound.title}
                  </p>
                ) : null}
                <Link
                  href={`/comun/pautas/${space.slug}/rodas/${roda.id}`}
                  className="mt-5 inline-flex min-h-12 w-fit items-center border-2 border-comun-black bg-comun-yellow px-5 text-sm font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
                >
                  Entrar na roda
                </Link>
              </article>
            ))}
            {!rodas.length ? (
              <Empty text="Esta pauta ainda não possui uma Roda Viva pública neste momento." />
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Evidências públicas
        </h2>
        <p className="comun-prose mt-2 max-w-3xl text-comun-paper/70">
          Referências públicas ajudam a entender a pauta, mas não definem
          automaticamente sua posição coletiva.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {evidence.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
          {!evidence.length ? (
            <Empty text="Esta pauta ainda não possui evidências públicas vinculadas." />
          ) : null}
        </div>
      </Section>

      {collectiveActionsEnabled ? (
        <PautaCollectiveActions
          pautaSlug={space.slug}
          actions={collectiveActions}
        />
      ) : null}

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Atividade e ação
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="paper-panel border-2 border-comun-black p-4"
            >
              <p className="text-xs font-black uppercase text-comun-asphalt/70">
                {task.status}
                {task.help_needed ? " · precisa de ajuda" : ""}
              </p>
              <h3 className="mt-1 font-black uppercase">{task.title}</h3>
              {task.description ? (
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {task.description}
                </p>
              ) : null}
            </article>
          ))}
          {!tasks.length ? (
            <Empty text="Nenhuma ação pública está registrada nesta pauta neste momento." />
          ) : null}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Participação
        </h2>
        <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
          {space.participation_public ??
            (contributions.length
              ? `${contributions.length} contribuições públicas recentes ajudam a construir esta pauta.`
              : "A conversa coletiva ainda está começando.")}
        </p>
        <div className="mt-5">
          <Link
            href="/comun/participar"
            className="inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4"
          >
            Ver formas de participar
          </Link>
        </div>
      </Section>

      {cycleMemoryEnabled && cycleMemory && !memoryIsPrimary ? (
        <PautaCycleMemory memory={cycleMemory} />
      ) : null}

      {!cycleMemoryEnabled ? (
        <Section>
          <h2 className="text-2xl font-black uppercase text-comun-yellow">
            Memória
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {dossiers.map((dossier) => (
              <Link
                key={dossier.id}
                href={`/comun/dossies/${dossier.public_slug}`}
                className="paper-panel border-2 border-comun-black p-4"
              >
                <p className="text-xs font-black uppercase text-comun-asphalt/70">
                  Síntese editorial ·{" "}
                  {dossier.public_version_label || "versão publicada"}
                </p>
                <h3 className="comun-prose mt-2 font-black uppercase">
                  {dossier.public_title}
                </h3>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
                  {dossier.public_summary}
                </p>
              </Link>
            ))}
            {!dossiers.length ? (
              <Empty text="Ainda não há síntese editorial publicada para esta pauta." />
            ) : null}
          </div>
        </Section>
      ) : null}
    </ComunShell>
  );
}

function EvidenceCard({ item }: { item: PublicPautaEvidenceItem }) {
  const citation = isPublicEvidenceCitationV1(item.public_evidence_payload)
    ? item.public_evidence_payload
    : null;
  return (
    <article className="paper-panel border-2 border-comun-black p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">
        {citation
          ? evidenceBadge(citation.sourceKind, citation.claimKind)
          : "Evidência pública aprovada"}
      </p>
      <h3 className="mt-2 font-black uppercase">{item.title}</h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
        {citation?.referencePeriod ??
          item.summary ??
          "Referência pública da pauta."}
      </p>
      {citation?.limitations.length ? (
        <p className="comun-prose mt-3 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/70">
          {citation.limitations[0]}
        </p>
      ) : item.public_note ? (
        <p className="comun-prose mt-3 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/70">
          {item.public_note}
        </p>
      ) : null}
      {citation ? (
        <Link
          href={citation.publicPath}
          className="mt-4 inline-flex min-h-10 items-center font-black uppercase underline decoration-2 underline-offset-4"
        >
          Ver fonte no COMUN
        </Link>
      ) : null}
    </article>
  );
}

function evidenceBadge(sourceKind: string, claimKind: string) {
  if (claimKind === "data_gap") return "Lacuna de dados documentada";
  return sourceKind === "reviewed_community_projection"
    ? "Observação comunitária revisada"
    : "Dados oficiais";
}

function primaryQuestion(space: PublicPautaSpace) {
  return space.problem_public ?? space.summary ?? space.title;
}
function publicState(space: PublicPautaSpace) {
  return space.public_status || statusLabel(space.status);
}
function statusLabel(value: string) {
  return (
    (
      {
        observing: "Observando",
        organizing: "Organizando",
        drafting: "Sintetizando",
        pressuring: "Cobrando",
        resolved: "Resolvida",
        unresolved: "Não resolvida",
      } as Record<string, string>
    )[value] ?? value
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
      {text}
    </p>
  );
}
