import Link from "next/link";
import { withComunAppV2 } from "@/lib/comun-experience";

const paths = [
  {
    id: "use",
    title: "Quero entender um assunto",
    description: "Consulte pautas, fontes e informações públicas no seu tempo.",
    href: "/comun/buscar",
    action: "Buscar um assunto",
  },
  {
    id: "participate",
    title: "Quero ajudar numa ação",
    description:
      "Veja o objetivo e as condições de uma atividade antes de decidir participar.",
    href: "/comun/acoes",
    action: "Conhecer ações",
  },
  {
    id: "organize",
    title: "Quero construir junto",
    description:
      "Conheça comunidades, seus propósitos e as formas de contribuir.",
    href: "/comun/comunidades",
    action: "Conhecer comunidades",
  },
] as const;

export function ComunParticipationPaths({ appV2 }: { appV2: boolean }) {
  return (
    <section
      aria-labelledby="participation-paths-title"
      data-comun-participation-paths="true"
      className="my-6"
    >
      <h2
        id="participation-paths-title"
        className={
          appV2
            ? "comun-v2-section-title"
            : "text-2xl font-black text-comun-yellow"
        }
      >
        Você escolhe como usar
      </h2>
      <p
        className={
          appV2
            ? "comun-text-secondary mt-2 text-sm"
            : "mt-2 text-comun-paper/80"
        }
      >
        Pode consultar, ajudar numa atividade ou construir um vínculo. Não
        precisa se associar para explorar.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {paths.map((path) => (
          <article
            key={path.id}
            data-comun-participation-path={path.id}
            className={
              appV2
                ? "surface-paper flex flex-col rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4"
                : "flex flex-col border-2 border-comun-paper/30 p-4"
            }
          >
            <h3 className="text-lg font-black">{path.title}</h3>
            <p className="mt-2 flex-1 text-sm">{path.description}</p>
            <Link
              href={withComunAppV2(path.href, appV2)}
              prefetch={false}
              className="mt-3 inline-flex min-h-11 items-center self-start font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {path.action}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-3 text-sm">
        Abrir um caminho não inscreve você nem assume uma tarefa.
      </p>
      <Link
        href={withComunAppV2("/comun/ajuda/primeira-acao", appV2)}
        className="mt-2 inline-flex min-h-11 items-center font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Não sei por onde começar
      </Link>
    </section>
  );
}
