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
  const current = new Set(membership?.collaboration_preferences ?? []),
    currentUpdates = new Set(membership?.update_preferences ?? []),
    state = membership?.state === "left" ? undefined : membership?.state;
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
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            name="intent"
            value={state ? "save" : "follow"}
            className="min-h-12 bg-comun-yellow px-5 font-black uppercase"
          >
            {state ? "Salvar preferências" : "Acompanhar"}
          </button>
          {state === "following" ? (
            <button
              name="intent"
              value="join"
              className="min-h-12 border-2 border-comun-black px-5 font-black uppercase"
            >
              Entrar como membro
            </button>
          ) : null}
        </div>
      </form>
      <aside className="border-2 border-comun-yellow p-5">
        <p className="text-xs font-black uppercase text-comun-yellow">
          Vínculo · {state ?? "ainda não acompanha"}
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase">
          {status
            ? "Alteração confirmada"
            : state
              ? `Você acompanha ${name}`
              : "Sem decisões obrigatórias"}
        </h2>
        <p role="status" className="mt-3 text-comun-paper/75">
          {state
            ? "Você receberá somente as atualizações escolhidas. Acompanhar ou entrar não concede papel operacional."
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
            Ver em Minha área
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
