import { randomUUID } from "node:crypto";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdminRole } from "@/lib/admin-auth";
import {
  COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS,
  COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS,
  COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES,
  listCollectiveEntityLegitimacyReviewQueue,
} from "@/lib/comun-collective-entity-legitimacy-runtime";
import { reviewCollectiveEntityCandidateFormAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ERROR_MESSAGES: Record<string, string> = {
  "entrada-invalida": "Revise decisão, fundamento e referência privada.",
  "autorevisao-bloqueada":
    "Quem representa a entidade não pode revisar o próprio candidato.",
  "revisor-invalido":
    "Esta operação exige perfil admin, editor ou factual_reviewer ativo.",
  "candidato-indisponivel":
    "O candidato deixou de estar disponível para revisão.",
  "requisicao-conflitante":
    "Esta requisição já foi utilizada com conteúdo diferente.",
  "resultado-ausente": "A revisão não retornou estado persistido.",
  "falha-segura": "A revisão foi bloqueada sem alterar a elegibilidade.",
};

export default async function CollectiveEntityReviewDesk(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdminRole([
    "admin",
    "editor",
    "factual_reviewer",
  ]);
  const queue = await listCollectiveEntityLegitimacyReviewQueue();

  const eligible = queue.filter(
    (item) => item.eligibilityState === "eligible_for_projection_review",
  ).length;
  const independent = queue.filter(
    (item) => item.eligibilityState === "needs_independent_review",
  ).length;

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">
            R4 · revisão privada de legitimidade
          </p>
          <h1 className="text-3xl font-black uppercase">Revisão de entidades</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-comun-asphalt/70">
            Revise existência da entidade e legitimidade da representação. Duas
            etapas suportadas precisam de revisores distintos para chegar à
            fila R5. Esta tela não publica.
          </p>
        </div>
        <div className="border-2 border-comun-black bg-comun-black p-3 text-comun-paper">
          <p className="text-xs font-black uppercase text-comun-yellow">
            Revisor autenticado
          </p>
          <p className="mt-1 text-sm font-bold">
            {session.profile.display_name} · {session.profile.role}
          </p>
        </div>
      </div>

      {searchParams.erro ? (
        <div role="alert" className="mt-5 border-2 border-comun-red bg-white p-4 font-bold">
          {ERROR_MESSAGES[searchParams.erro] ??
            "A revisão foi bloqueada sem mudar o candidato."}
        </div>
      ) : null}
      {searchParams.resultado ? (
        <div role="status" className="mt-5 border-2 border-comun-black bg-comun-yellow p-4 font-black uppercase">
          Revisão registrada · estado {searchParams.estado ?? "desconhecido"}
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Metric label="Na fila" value={queue.length} />
        <Metric label="Precisam outro revisor" value={independent} />
        <Metric label="Elegíveis para R5" value={eligible} />
      </section>

      <section className="mt-7 grid gap-4">
        {queue.map((item) => {
          const defaultStage =
            item.entityExistenceState === "supported"
              ? "representation_legitimacy"
              : "entity_existence";
          return (
            <article key={item.candidateId} className="border-2 border-comun-black bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.95fr)]">
                <div>
                  <p className="text-xs font-black uppercase text-comun-asphalt/60">
                    {item.entityType} · {new Date(item.generatedAt).toLocaleString("pt-BR")}
                  </p>
                  <h2 className="mt-1 text-xl font-black uppercase">{item.publicName}</h2>
                  <div className="mt-3 grid gap-2 text-sm">
                    <State label="Existência" value={item.entityExistenceState} />
                    <State label="Representação" value={item.representationLegitimacyState} />
                    <State label="Elegibilidade" value={item.eligibilityState} />
                  </div>
                  {item.eligibilityState === "needs_independent_review" ? (
                    <p className="mt-3 border-l-4 border-comun-yellow pl-3 text-sm font-bold">
                      As duas etapas ainda não têm suporte de revisores distintos.
                    </p>
                  ) : null}
                </div>

                <form action={reviewCollectiveEntityCandidateFormAction} className="grid gap-3 border-2 border-comun-black bg-comun-paper p-3">
                  <input type="hidden" name="request_id" value={randomUUID()} />
                  <input type="hidden" name="candidate_id" value={item.candidateId} />
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Etapa
                    <select name="review_stage" defaultValue={defaultStage} className="min-h-11 border-2 border-comun-black bg-white px-2">
                      {COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES.map((stage) => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Decisão
                    <select name="decision" defaultValue="needs_evidence" className="min-h-11 border-2 border-comun-black bg-white px-2">
                      {COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS.map((decision) => (
                        <option key={decision} value={decision}>{decision}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Fundamento
                    <select name="basis_kind" defaultValue="insufficient_or_conflicting" className="min-h-11 border-2 border-comun-black bg-white px-2">
                      {COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS.map((basis) => (
                        <option key={basis} value={basis}>{basis}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Referência privada
                    <textarea
                      name="basis_reference_private"
                      rows={3}
                      maxLength={1000}
                      className="border-2 border-comun-black bg-white p-2 normal-case"
                      placeholder="Fonte, protocolo ou nota operacional. Obrigatória para supported, contested e unsupported."
                    />
                  </label>
                  <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">
                    Registrar revisão
                  </button>
                </form>
              </div>
            </article>
          );
        })}
        {!queue.length ? (
          <p className="border-2 border-comun-black bg-white p-5">
            Nenhum candidato privado aguardando revisão.
          </p>
        ) : null}
      </section>

      <aside className="mt-7 border-2 border-comun-black bg-comun-black p-4 text-sm text-comun-paper">
        <p className="font-black uppercase text-comun-yellow">Separação de funções</p>
        <p className="mt-2">
          O representante não pode revisar o próprio candidato. R4 apenas
          determina elegibilidade para revisão de projeção; a publicação
          continua sendo uma decisão separada de publisher no R5.
        </p>
      </aside>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
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
