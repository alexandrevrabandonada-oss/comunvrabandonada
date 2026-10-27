import Link from "next/link";
import { ExternalLink, Gamepad2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { ComunShell, Section } from "@/components/comun-shell";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const metadata: Metadata = {
  title: "Jogos | COMUN",
  description:
    "Descubra jogos autorais e independentes. Comece por VR: Cidade em Disputa, uma aventura urbana em beta.",
};

const cityGame = {
  title: "VR: Cidade em Disputa",
  url: "https://www.alexandrevrabandonada.online/jogar/cidade-em-disputa",
  summary:
    "Um RPG urbano de investigação, memória e exploração em uma interpretação de Volta Redonda.",
} as const;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const exploreHref = appV2
    ? withComunAppV2("/comun/explorar")
    : "/comun/explorar";

  return (
    <ComunShell
      appBar={
        appV2
          ? {
              title: "Jogos",
              contextLabel: "Descoberta cultural",
              backDestination: exploreHref,
            }
          : undefined
      }
    >
      <Section>
        <div data-comun-games-catalog="true" className="max-w-5xl">
          <Link
            href={exploreHref}
            className="inline-flex min-h-11 items-center font-bold underline"
          >
            Explorar mais conteúdos
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-wider text-comun-yellow">
            Jogar também é conviver
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper sm:text-5xl">
            Jogos
          </h1>
          <p className="mt-3 max-w-3xl text-comun-paper/80">
            Um lugar para descobrir aventuras, divertir-se e conhecer quem cria.
            Jogar não exige participar de uma pauta ou atividade política.
          </p>

          <section
            aria-labelledby="city-game-title"
            className="mt-8 border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black shadow-[5px_5px_0_#F2C230] sm:p-7"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div
                aria-hidden="true"
                className="flex min-h-36 w-full flex-col items-center justify-center gap-3 border-2 border-comun-black bg-comun-black px-5 text-center text-comun-yellow md:w-48"
              >
                <Gamepad2 size={48} strokeWidth={1.5} />
                <span className="text-xs font-black uppercase tracking-wider">
                  RPG urbano
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-comun-rust">
                  Primeiro jogo · Beta pública
                </p>
                <h2 id="city-game-title" className="mt-2 text-2xl font-black">
                  {cityGame.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed">
                  {cityGame.summary}
                </p>
                <p className="mt-3 text-sm">
                  O jogo está em outra página e mantém seu progresso no
                  navegador e no domínio onde é executado. Não há sincronização
                  automática com a conta COMUN.
                </p>
                <a
                  href={cityGame.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="mt-5 inline-flex min-h-12 items-center gap-2 border-2 border-comun-black bg-comun-yellow px-5 py-3 text-center text-sm font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-comun-rust"
                >
                  Jogar Cidade em Disputa
                  <ExternalLink size={18} aria-hidden="true" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
                <p className="mt-3 text-xs">
                  Abre em outra aba, fora do COMUN. O jogo pode precisar de
                  tempo para carregar e de controles próprios.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="community-games-title"
            className="mt-8 border border-comun-paper/40 p-5 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <UsersRound
                size={24}
                className="text-comun-yellow"
                aria-hidden="true"
              />
              <h2
                id="community-games-title"
                className="text-2xl font-black text-comun-paper"
              >
                Jogos da comunidade
              </h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-comun-paper/80">
              Queremos abrir espaço para jogos autorais, inclusive os que são
              apenas divertidos. Ainda não existe envio público de jogos no
              COMUN: estamos definindo critérios de autoria, segurança,
              acessibilidade e publicação. Nenhum jogo ou criador fictício
              aparece neste catálogo.
            </p>
          </section>
        </div>
      </Section>
    </ComunShell>
  );
}
