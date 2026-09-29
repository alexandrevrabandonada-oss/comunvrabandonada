import { randomUUID } from "node:crypto";
import { ComunShell, Section } from "@/components/comun-shell";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  collectiveEntityRuntimeConsent,
  listOwnCollectiveEntityCandidates,
  listOwnCollectiveEntityStates,
} from "@/lib/comun-collective-entity-runtime";
import { listOwnCollectiveEntityLegitimacyStates } from "@/lib/comun-collective-entity-legitimacy-runtime";
import { COMUN_COLLECTIVE_ENTITY_TYPES } from "@/lib/comun-collective-entity-consent";
import {
  createCollectiveEntityFormAction,
  prepareCollectiveEntityCandidateFormAction,
  revokeCollectiveRepresentationFormAction,
  setCollectiveEntityConsentFormAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_LABELS: Record<string, string> = {
  association: "Associação",
  collective: "Coletivo",
  community_group: "Grupo comunitário",
  informal_group: "Grupo informal",
  other: "Outro",
};

const ERROR_MESSAGES: Record<string, string> = {
  "entrada-invalida": "Revise os campos antes de continuar.",
  "consentimento-necessario":
    "Ative o consentimento explícito antes de preparar um candidato.",
  "representacao-necessaria":
    "A representação precisa continuar ativa para preparar o candidato.",
  "candidato-ja-pendente":
    "Já existe um candidato aguardando revisão para esta entidade.",
  "entidade-indisponivel": "Esta entidade não está disponível para esta etapa.",
  "requisicao-conflitante":
    "A mesma requisição já foi usada com dados diferentes.",
  "revogacao-bloqueada": "A revogação foi bloqueada pelo estado atual.",
  "confirmacao-consentimento":
    "Marque a confirmação antes de ativar o consentimento.",
  "confirmacao-revogacao":
    "Marque a confirmação antes de revogar o consentimento.",
  "confirmacao-representacao":
    "Marque a confirmação antes de encerrar sua representação.",
  "falha-segura":
    "A operação foi bloqueada sem publicar nem alterar o mapa.",
};

const RESULT_MESSAGES: Record<string, string> = {
  "entidade-criada":
    "Entidade declarada. Nenhuma publicação ocorreu; agora você pode revisar o consentimento.",
  "consentimento-ativo":
    "Consentimento registrado. Isso ainda não cria candidato nem publicação.",
  "consentimento-revogado":
    "Consentimento revogado. Candidatos pendentes vinculados deixam de ser elegíveis.",
  "candidato-enviado":
    "Candidato privado preparado e enviado para revisão de legitimidade.",
  "representacao-revogada":
    "Representação revogada. Nenhuma nova decisão pode usar esse vínculo.",
};

export default async function CollectiveEntitiesPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  await requireCommunitySession("/comun/entidades");

  const [entities, candidates, legitimacy] = await Promise.all([
    listOwnCollectiveEntityStates(),
    listOwnCollectiveEntityCandidates(),
    listOwnCollectiveEntityLegitimacyStates(),
  ]);
  const legitimacyByCandidate = new Map(
    legitimacy.map((item) => [item.candidateId, item]),
  );

  return (
    <ComunShell>
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase text-comun-yellow">
            Entidade coletiva · representação e consentimento
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase text-comun-paper">
            Participar como entidade
          </h1>
          <p className="mt-3 text-comun-paper/80">
            Declare uma entidade que você representa, escolha conscientemente
            se autoriza uma futura projeção pública sanitizada e envie um
            candidato privado para revisão. Nenhuma dessas etapas publica
            automaticamente.
          </p>
        </div>

        {searchParams.erro ? (
          <div role="alert" className="mt-5 border-2 border-comun-red bg-white p-4 font-bold">
            {ERROR_MESSAGES[searchParams.erro] ??
              "A operação foi bloqueada sem alterar o estado público."}
          </div>
        ) : null}
        {searchParams.resultado ? (
          <div role="status" className="mt-5 border-2 border-comun-black bg-comun-yellow p-4 font-bold">
            {RESULT_MESSAGES[searchParams.resultado] ??
              "Operação registrada com sucesso."}
          </div>
        ) : null}

        <section className="mt-6 border-2 border-comun-black bg-white p-5 text-comun-black">
          <h2 className="text-xl font-black uppercase">Declarar entidade</h2>
          <p className="mt-1 text-sm text-comun-asphalt/70">
            A declaração cria apenas uma representação privada. Ela não prova
            legitimidade e não autoriza publicação.
          </p>
          <form action={createCollectiveEntityFormAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="request_id" value={randomUUID()} />
            <label className="grid gap-1 text-sm font-black uppercase">
              Nome público
              <input
                name="public_name"
                required
                minLength={3}
                maxLength={160}
                className="min-h-11 border-2 border-comun-black px-3 normal-case"
              />
            </label>
            <label className="grid gap-1 text-sm font-black uppercase">
              Tipo
              <select name="entity_type" defaultValue="collective" className="min-h-11 border-2 border-comun-black px-3">
                {COMUN_COLLECTIVE_ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </label>
            <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">
              Declarar representação
            </button>
          </form>
        </section>

        <section className="mt-6 border-2 border-comun-black bg-comun-black p-5 text-comun-paper">
          <h2 className="font-black uppercase text-comun-yellow">
            O que o consentimento autoriza
          </h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {collectiveEntityRuntimeConsent.notice.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </section>

        <section className="mt-7">
          <h2 className="text-xl font-black uppercase text-comun-paper">
            Minhas entidades
          </h2>
          <div className="mt-4 grid gap-4">
            {entities.map((entity) => {
              const entityCandidates = candidates.filter(
                (candidate) => candidate.entityId === entity.entityId,
              );
              const pending = entityCandidates.find(
                (candidate) => candidate.candidateState === "pending_legitimacy",
              );
              const canPrepare =
                entity.entityState === "active" &&
                entity.representationStatus !== "revoked" &&
                entity.consentActive &&
                !pending;

              return (
                <article key={entity.entityId} className="border-2 border-comun-black bg-white p-5 text-comun-black">
                  <p className="text-xs font-black uppercase text-comun-asphalt/60">
                    {TYPE_LABELS[entity.entityType] ?? entity.entityType}
                  </p>
                  <h3 className="mt-1 text-xl font-black uppercase">{entity.publicName}</h3>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <State label="Entidade" value={entity.entityState} />
                    <State label="Representação" value={entity.representationStatus} />
                    <State label="Consentimento" value={entity.consentActive ? "ativo" : entity.consentWithdrawn ? "revogado" : "não concedido"} />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {!entity.consentActive && entity.representationStatus !== "revoked" ? (
                      <form action={setCollectiveEntityConsentFormAction} className="border-2 border-comun-black bg-comun-paper p-3">
                        <input type="hidden" name="entity_id" value={entity.entityId} />
                        <input type="hidden" name="active" value="true" />
                        <label className="flex items-start gap-2 text-sm font-bold">
                          <input type="checkbox" name="confirm_consent" className="mt-1" />
                          <span>Li o aviso acima e autorizo somente a futura projeção sanitizada descrita.</span>
                        </label>
                        <button className="mt-3 min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">
                          Ativar consentimento
                        </button>
                      </form>
                    ) : null}

                    {entity.consentActive ? (
                      <form action={setCollectiveEntityConsentFormAction} className="border-2 border-comun-black p-3">
                        <input type="hidden" name="entity_id" value={entity.entityId} />
                        <input type="hidden" name="active" value="false" />
                        <label className="flex items-start gap-2 text-sm font-bold">
                          <input type="checkbox" name="confirm_revocation" className="mt-1" />
                          <span>Confirmo que quero revogar este consentimento agora.</span>
                        </label>
                        <button className="mt-3 min-h-10 border-2 border-comun-black px-3 text-xs font-black uppercase">
                          Revogar consentimento
                        </button>
                      </form>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t-2 border-comun-black pt-4">
                    <h4 className="font-black uppercase">Candidato para revisão</h4>
                    {canPrepare ? (
                      <form action={prepareCollectiveEntityCandidateFormAction} className="mt-3">
                        <input type="hidden" name="entity_id" value={entity.entityId} />
                        <input type="hidden" name="request_id" value={randomUUID()} />
                        <p className="text-sm text-comun-asphalt/70">
                          O candidato copia apenas nome/tipo sanitizados e entra em revisão privada R4.
                        </p>
                        <button className="mt-3 min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">
                          Enviar para revisão de legitimidade
                        </button>
                      </form>
                    ) : (
                      <p className="mt-2 text-sm text-comun-asphalt/70">
                        {pending
                          ? "Já existe um candidato aguardando ou passando por revisão."
                          : entity.representationStatus === "revoked"
                            ? "A representação foi revogada."
                            : !entity.consentActive
                              ? "Ative o consentimento antes de enviar um candidato."
                              : "Esta entidade não está disponível para candidatura."}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3">
                      {entityCandidates.map((candidate) => {
                        const review = legitimacyByCandidate.get(candidate.candidateId);
                        return (
                          <div key={candidate.candidateId} className="border-l-4 border-comun-yellow bg-comun-paper p-3">
                            <p className="text-xs font-black uppercase">
                              {candidate.candidateState} · {new Date(candidate.generatedAt).toLocaleString("pt-BR")}
                            </p>
                            {review ? (
                              <div className="mt-2 grid gap-1 text-sm">
                                <p>Existência da entidade: <strong>{review.entityExistenceState}</strong></p>
                                <p>Legitimidade da representação: <strong>{review.representationLegitimacyState}</strong></p>
                                <p>Estado: <strong>{review.eligibilityState}</strong></p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {!entityCandidates.length ? (
                        <p className="text-sm text-comun-asphalt/60">Nenhum candidato preparado.</p>
                      ) : null}
                    </div>
                  </div>

                  {entity.representationStatus !== "revoked" ? (
                    <details className="mt-5 border-t border-comun-black/20 pt-3">
                      <summary className="cursor-pointer text-xs font-black uppercase">
                        Encerrar minha representação
                      </summary>
                      <form action={revokeCollectiveRepresentationFormAction} className="mt-3 border-2 border-comun-red p-3">
                        <input type="hidden" name="entity_id" value={entity.entityId} />
                        <label className="flex items-start gap-2 text-sm font-bold">
                          <input type="checkbox" name="confirm_representation_revocation" className="mt-1" />
                          <span>Confirmo a revogação da minha representação. Candidatos pendentes vinculados serão invalidados.</span>
                        </label>
                        <button className="mt-3 min-h-10 border-2 border-comun-black px-3 text-xs font-black uppercase">
                          Revogar representação
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              );
            })}
            {!entities.length ? (
              <p className="border-2 border-comun-black bg-white p-5 text-comun-black">
                Você ainda não declarou nenhuma entidade.
              </p>
            ) : null}
          </div>
        </section>

        <aside className="mt-7 border-2 border-comun-black bg-comun-black p-4 text-sm text-comun-paper">
          <p className="font-black uppercase text-comun-yellow">Limite desta etapa</p>
          <p className="mt-2">
            Declaração, consentimento e revisão não abrem o mapa, não publicam relatos e não permitem autopublicação.
          </p>
        </aside>
      </Section>
    </ComunShell>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-comun-yellow pl-3">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}
