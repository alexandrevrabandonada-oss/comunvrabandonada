import Link from "next/link";
import { changeCommunityMembership } from "@/app/comun/c/[slug]/participar/actions";

const collaboration = [
  ["circles", "Participar de rodas"],
  ["actions", "Ajudar em ações"],
  ["research", "Pesquisar"],
  ["art", "Contribuir com Arte"],
  ["radio", "Colaborar com Rádio"],
  ["communication", "Apoiar comunicação"],
  ["territory", "Colaborar no território"],
];
const updates = [
  ["pautas", "Mudança de etapa em pauta"],
  ["circles", "Roda ou síntese"],
  ["activities", "Atividade próxima"],
  ["results", "Resultado comprovado"],
  ["memory", "Memória publicada"],
  ["art", "Arte relacionada"],
  ["radio", "Rádio relacionada"],
];

export function CommunityParticipationOnboarding({
  slug,
  name,
  pautaHref,
  membership,
  status,
}: {
  slug: string;
  name: string;
  pautaHref: string;
  membership: any;
  status?: string;
}) {
  const current = new Set(membership?.collaboration_preferences ?? []);
  const currentUpdates = new Set(membership?.update_preferences ?? []);
  const state = membership?.state === "left" ? undefined : membership?.state;
  const requestPending = Boolean(membership?.membership_request);
  const stateLabel = requestPending
    ? "solicitação em análise"
    : state === "member"
      ? "membro"
      : state === "paused"
        ? "atualizações pausadas"
        : state === "following"
          ? "acompanhando"
          : "ainda não acompanha";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
      <form
        action={changeCommunityMembership}
        className="bg-comun-paper p-5 text-comun-black"
      >
        <input type="hidden" name="slug" value={slug} />
        <h2 className="text-2xl font-black uppercase">
          Como quer se aproximar?
        </h2>
        <p className="mt-2">As escolhas são opcionais e não concedem papel.</p>
        <fieldset className="mt-5">
          <legend className="font-black uppercase">
            Formas de colaboração
          </legend>
          <div className="mt-2 grid gap-2">
            {collaboration.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center gap-3 border-2 p-3"
              >
                <input
                  defaultChecked={current.has(value)}
                  type="checkbox"
                  name="collaboration"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="font-black uppercase">
            Atualizações significativas
          </legend>
          <div className="mt-2 grid gap-2">
            {updates.map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-3">
                <input
                  defaultChecked={currentUpdates.has(value)}
                  type="checkbox"
                  name="updates"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {state === "following" && !requestPending ? (
          <label className="mt-5 grid gap-2 font-bold">
            Por que deseja entrar como membro? <span>(opcional)</span>
            <textarea
              className="border-2 p-3"
              maxLength={800}
              name="request_message"
              placeholder="Conte como pretende colaborar. A mensagem fica restrita à equipe responsável."
              rows={3}
            />
          </label>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            name="intent"
            value={state ? "save" : "follow"}
            className="min-h-12 bg-comun-yellow px-5 font-black uppercase"
          >
            {state ? "Salvar preferências" : "Acompanhar"}
          </button>
          {state === "following" && !requestPending ? (
            <button
              name="intent"
              value="join"
              className="min-h-12 border-2 border-comun-black px-5 font-black uppercase"
            >
              Solicitar entrada como membro
            </button>
          ) : null}
        </div>
      </form>
      <aside className="border-2 border-comun-yellow p-5">
        <p className="text-xs font-black uppercase text-comun-yellow">
          Vínculo · {stateLabel}
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase">
          {status === "requested" || requestPending
            ? "Solicitação recebida"
            : status
              ? "Alteração confirmada"
              : state
                ? `Você acompanha ${name}`
                : "Sem decisões obrigatórias"}
        </h2>
        <p role="status" className="mt-3 text-comun-paper/75">
          {requestPending
            ? "Você continua acompanhando a comunidade. Entrar como membro depende de revisão e não concede automaticamente papel operacional."
            : state
              ? "Você receberá somente as atualizações escolhidas. Acompanhar não concede papel; papéis são concedidos separadamente e podem ser revogados."
              : "Explore livremente. A conta é usada apenas para persistir o vínculo."}
        </p>
        <div className="mt-5 grid gap-3">
          <Link
            href={pautaHref}
            className="inline-flex min-h-12 items-center justify-center bg-comun-yellow px-4 font-black uppercase text-comun-black"
          >
            Abrir pauta
          </Link>
          <Link
            href="/comun/minha-participacao"
            className="font-black underline"
          >
            Ver em Minha participação
          </Link>
          {state && state !== "left" ? (
            <form action={changeCommunityMembership}>
              <input type="hidden" name="slug" value={slug} />
              {state === "paused" ? (
                <button
                  name="intent"
                  value="resume"
                  className="font-black underline"
                >
                  Retomar atualizações
                </button>
              ) : (
                <button
                  name="intent"
                  value="pause"
                  className="font-black underline"
                >
                  Pausar atualizações
                </button>
              )}
              <button
                name="intent"
                value="leave"
                className="ml-5 font-black text-comun-yellow underline"
              >
                Deixar comunidade
              </button>
            </form>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
