import Link from "next/link";
import { ComunPracticeMaterialLinks } from "@/components/comun-practice-material-links";
import { ComunShell } from "@/components/comun-shell";
import { ComunBreadcrumbs, ComunSection } from "@/components/comun-ui";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-experience";
import {
  participationGuidance,
  resolveParticipationGuidanceStage,
} from "@/lib/comun-practice-guidance";

export const metadata = { title: "Do assunto à primeira ação | COMUN" };

const steps = [
  {
    title: "1. Escolha uma pergunta",
    text: "Comece com algo que você quer entender no território. Por exemplo: quais barreiras existem nas calçadas do meu bairro? Busque o assunto e abra uma pauta ou fonte relacionada.",
    check: "Antes de seguir: você consegue dizer qual pergunta quer responder?",
    href: "/comun/buscar",
    action: "Pesquisar meu assunto",
  },
  {
    title: "2. Confira o que já sabemos",
    text: "Veja as fontes, as datas e o estado da pauta. Separe o que está documentado do que ainda precisa de confirmação. Se faltar informação, mantenha a dúvida explícita.",
    check:
      "Antes de seguir: qual fonte sustenta o que você encontrou? O que ainda falta saber?",
    href: "/comun/pautas",
    action: "Consultar pautas e fontes",
  },
  {
    title: "3. Escolha uma contribuição possível",
    text: "Consulte uma ação e confira o objetivo, o responsável, o tempo e as condições informadas. Se esses detalhes faltarem, peça orientação antes de assumir um compromisso. Você também pode continuar apenas acompanhando.",
    check:
      "Antes de participar: você sabe o que vai fazer e como saberá o resultado?",
    href: "/comun/acoes",
    action: "Ver ações e condições",
  },
] as const;

export default async function FirstActionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const href = (path: string) => withComunAppV2(path, appV2);
  const stage = resolveParticipationGuidanceStage(params.etapa);
  const guidance = participationGuidance[stage ?? "registro"];

  return (
    <ComunShell publicReadOnlyFallback>
      <ComunSection>
        <ComunBreadcrumbs
          items={[
            { label: "Início", href: href("/comun") },
            { label: "Participar", href: href("/comun/participar") },
            { label: "Primeira ação" },
          ]}
        />
        <h1 className="text-3xl font-black sm:text-4xl">
          Do assunto à primeira ação
        </h1>
        <p className="mt-3 max-w-3xl">
          Aprenda fazendo: escolha uma pergunta, confira as fontes e encontre
          uma contribuição possível. Pode parar e consultar esta orientação
          quando precisar.
        </p>
        <p className="mt-2 text-sm">
          Esta orientação é pública. Não registra progresso nem assume
          compromissos por você.
        </p>
        <ol className="mt-6 grid gap-4" data-comun-first-action-guide="true">
          {steps.map((step) => (
            <li
              key={step.title}
              className={
                appV2
                  ? "surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-5"
                  : "border-2 border-comun-paper/30 p-5"
              }
            >
              <h2 className="text-xl font-black">{step.title}</h2>
              <p className="mt-3 max-w-3xl">{step.text}</p>
              <p className="mt-3 max-w-3xl text-sm font-bold">{step.check}</p>
              <Link
                href={href(step.href)}
                prefetch={false}
                className="mt-3 inline-flex min-h-11 items-center font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {step.action}
              </Link>
            </li>
          ))}
        </ol>
        <section
          className="mt-6 border-l-4 border-comun-yellow p-4"
          aria-labelledby="practice-guidance-title"
          data-comun-practice-guidance={stage ?? "registro"}
        >
          <h2 id="practice-guidance-title" className="text-xl font-black">
            {guidance.title}
          </h2>
          <p className="mt-2 max-w-3xl">{guidance.summary}</p>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5">
            {guidance.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Consultar este material não registra uma formação concluída nem
            assume uma tarefa.
          </p>
          <ComunPracticeMaterialLinks
            stage={stage ?? "registro"}
            appV2={appV2}
          />
          <Link
            href={href(guidance.href)}
            prefetch={false}
            className="mt-3 inline-flex min-h-11 items-center font-black underline"
          >
            {guidance.action}
          </Link>
        </section>
        <section className="mt-6" aria-labelledby="first-action-return">
          <h2 id="first-action-return" className="text-xl font-black">
            Depois, volte ao que mudou
          </h2>
          <p className="mt-2 max-w-3xl">
            Retorne à pauta para consultar respostas e resultados públicos. Se
            já usa uma conta, Minha participação reúne os acompanhamentos e
            compromissos registrados nos fluxos disponíveis.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link
              className="inline-flex min-h-11 items-center font-black underline"
              href={href("/comun/participar")}
            >
              Voltar às formas de participação
            </Link>
            <Link
              className="inline-flex min-h-11 items-center font-black underline"
              href={href("/comun/minha-participacao")}
            >
              Abrir Minha participação
            </Link>
          </div>
        </section>
      </ComunSection>
    </ComunShell>
  );
}
