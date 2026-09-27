import { randomUUID } from "node:crypto";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdminRole } from "@/lib/admin-auth";
import {
  listCollectiveEntityProjectionReviewQueue,
  listSanitizedCollectiveEntityPublicProjections,
} from "@/lib/comun-collective-entity-projection-runtime";
import { decideCollectiveEntityProjectionFormAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ERROR_MESSAGES: Record<string, string> = {
  "entrada-invalida": "A decisão não passou pela validação do servidor.",
  "confirmacao-publicacao":
    "Publicar exige marcar a confirmação explícita de projeção pública.",
  "autopublicacao-bloqueada":
    "A pessoa autenticada representa esta entidade e não pode publicá-la.",
  "publisher-invalido":
    "Esta operação exige um perfil publisher ativo e vinculado à conta.",
  "candidato-indisponivel":
    "O candidato deixou de estar elegível para revisão de projeção.",
  "requisicao-conflitante":
    "Esta requisição já foi usada com conteúdo diferente.",
  "resultado-ausente": "A decisão não retornou um resultado persistido.",
  "falha-segura":
    "A decisão foi bloqueada. O estado público não foi alterado por esta tela.",
};

export default async function CollectiveEntityPublisherDesk(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdminRole(["publisher"]);
  const [queue, activeProjections] = await Promise.all([
    listCollectiveEntityProjectionReviewQueue(),
    listSanitizedCollectiveEntityPublicProjections(),
  ]);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">
            R5 · publicação separada da legitimidade
          </p>
          <h1 className="text-3xl font-black uppercase">
            Entidades coletivas
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-comun-asphalt/70">
            A fila mostra somente entidades que chegaram a
            eligible_for_projection_review. Isso não autoriza publicação por
            si só: cada projeção exige uma decisão explícita de publisher.
          </p>
        </div>
        <div className="border-2 border-comun-black bg-comun-black p-3 text-comun-paper">
          <p className="text-xs font-black uppercase text-comun-yellow">
            Publisher autenticado
          </p>
          <p className="mt-1 text-sm font-bold">{session.profile.display_name}</p>
        </div>
      </div>

      {searchParams.erro ? (
        <div
          role="alert"
          className="mt-5 border-2 border-comun-black bg-white p-4 font-bold"
        >
          {ERROR_MESSAGES[searchParams.erro] ??
            "A operação foi bloqueada sem alterar a projeção pública."}
        </div>
      ) : null}

      {searchParams.resultado ? (
        <div
          role="status"
          className="mt-5 border-2 border-comun-black bg-comun-yellow p-4 font-black uppercase"
        >
          Decisão registrada: {searchParams.resultado} · estado{" "}
          {searchParams.estado ?? "desconhecido"}
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Metric label="Elegíveis na fila" value={queue.length} />
        <Metric label="Projeções públicas ativas" value={activeProjections.length} />
        <Metric
          label="Fila já projetada"
          value={queue.filter((item) => item.projectionState === "active").length}
        />
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase">Fila de publicação</h2>
            <p className="mt-1 text-sm text-comun-asphalt/70">
              Rationale é privado. Identidade do publisher nunca vem do
              formulário.
            </p>
          </div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">
            Publish começa desmarcado por segurança
          </p>
        </div>

        <div className="mt-4 grid gap-4">
          {queue.map((item) => (
            <article
              key={item.candidateId}
              className="border-2 border-comun-black bg-white p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
                <div>
                  <p className="text-xs font-black uppercase text-comun-asphalt/60">
                    {item.entityType} · gerado em{" "}
                    {new Date(item.generatedAt).toLocaleString("pt-BR")}
                  </p>
                  <h3 className="mt-1 text-xl font-black uppercase">
                    {item.publicName}
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Status
                      label="Última decisão"
                      value={item.projectionDecisionState}
                    />
                    <Status
                      label="Projeção"
                      value={item.projectionState}
                    />
                  </dl>
                </div>

                <form
                  action={decideCollectiveEntityProjectionFormAction}
                  className="grid gap-3 border-2 border-comun-black bg-comun-paper p-3"
                >
                  <input
                    type="hidden"
                    name="request_id"
                    value={randomUUID()}
                  />
                  <input
                    type="hidden"
                    name="candidate_id"
                    value={item.candidateId}
                  />
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Decisão
                    <select
                      name="decision"
                      defaultValue="hold"
                      className="min-h-11 border-2 border-comun-black bg-white px-2"
                    >
                      <option value="hold">hold · aguardar</option>
                      <option value="publish">publish · projetar</option>
                      <option value="reject">reject · rejeitar</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase">
                    Justificativa privada
                    <textarea
                      name="rationale_private"
                      minLength={3}
                      maxLength={1000}
                      required
                      rows={3}
                      className="border-2 border-comun-black bg-white p-2 normal-case"
                      placeholder="Registre a razão da decisão para o histórico privado."
                    />
                  </label>
                  <label className="flex items-start gap-2 border-2 border-comun-black bg-white p-3 text-xs font-bold">
                    <input
                      type="checkbox"
                      name="confirm_publication"
                      className="mt-0.5"
                    />
                    <span>
                      Confirmo a criação ou reativação da projeção pública caso
                      eu escolha <strong>publish</strong>.
                    </span>
                  </label>
                  <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">
                    Registrar decisão
                  </button>
                </form>
              </div>
            </article>
          ))}
          {!queue.length ? (
            <p className="border-2 border-comun-black bg-white p-5 font-bold">
              Nenhuma entidade está elegível para revisão de projeção neste
              momento.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black uppercase">
          Projeções sanitizadas ativas
        </h2>
        <p className="mt-1 text-sm text-comun-asphalt/70">
          Esta leitura usa somente o DTO público mínimo: nome, tipo, data e ID
          opaco. Não inclui representante, consentimento, evidência ou
          localização.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activeProjections.map((projection) => (
            <article
              key={projection.projectionId}
              className="border-2 border-comun-black bg-white p-4"
            >
              <p className="text-xs font-black uppercase text-comun-asphalt/60">
                {projection.entityType}
              </p>
              <h3 className="mt-1 font-black uppercase">
                {projection.publicName}
              </h3>
              <p className="mt-2 text-xs font-bold text-comun-asphalt/60">
                Publicado em{" "}
                {new Date(projection.publishedAt).toLocaleString("pt-BR")}
              </p>
            </article>
          ))}
          {!activeProjections.length ? (
            <p className="border-2 border-comun-black bg-white p-5">
              Nenhuma projeção pública ativa.
            </p>
          ) : null}
        </div>
      </section>

      <aside className="mt-8 border-2 border-comun-black bg-comun-black p-4 text-sm text-comun-paper">
        <p className="font-black uppercase text-comun-yellow">
          Limite desta etapa
        </p>
        <p className="mt-2">
          Publicar uma entidade aqui não abre mapa, não cria coordenadas, não
          altera future_map_eligibility e não publica relatos individuais.
        </p>
      </aside>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-comun-yellow pl-3">
      <dt className="text-xs font-black uppercase text-comun-asphalt/60">
        {label}
      </dt>
      <dd className="font-black">{value}</dd>
    </div>
  );
}
