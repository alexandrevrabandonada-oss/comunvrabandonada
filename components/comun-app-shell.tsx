import Link from "next/link";
import type { ReactNode } from "react";
import { ParticipateSheet, SearchSheet } from "./comun-experience-controls";
import {
  ComunMemberNavigation,
  ComunMobileNavigation,
  ComunPrimaryNavigation,
} from "./comun-navigation";
import { ComunPwaRuntime, ComunShareButton } from "./comun-pwa-runtime";
import { ComunMobileAppBar } from "./comun-mobile-app-bar";

export function ComunAppShell({
  children,
  showSyntheticNotice = true,
}: {
  children: ReactNode;
  showSyntheticNotice?: boolean;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
      <ComunPwaRuntime />
      <a
        href="#conteudo"
        className="sr-only z-50 bg-comun-yellow p-3 font-black text-comun-black focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Pular para o conteúdo
      </a>
      {showSyntheticNotice ? (
        <div
          role="note"
          className="bg-comun-yellow px-4 py-1 text-center text-xs font-black text-comun-black"
        >
          Versão em preparação · acesso piloto
        </div>
      ) : null}
      <header className="sticky top-0 z-30 hidden border-b-2 border-comun-yellow bg-comun-black pt-[env(safe-area-inset-top)] text-comun-paper lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <Link
            href="/comun"
            aria-label="COMUN VR Abandonada"
            className="max-w-32 text-lg font-black leading-none tracking-[-.05em] text-comun-paper"
          >
            COMUN<span className="text-comun-yellow">.</span>
          </Link>
          <ComunPrimaryNavigation />
          <div className="flex items-center gap-1 sm:gap-2">
            <ComunMemberNavigation />
            <ComunShareButton title="COMUN VR Abandonada" />
            <ParticipateSheet />
            <SearchSheet />
          </div>
        </div>
      </header>
      <ComunMobileAppBar />
      <main id="conteudo" className="pb-24 lg:pb-0">
        {children}
      </main>
      <footer className="border-t-2 border-comun-black bg-comun-asphalt px-4 py-10 text-comun-paper">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-xl font-black text-comun-yellow">COMUN.</p>
            <p className="mt-2 text-sm text-comun-paper/75">
              Território, comunidade, pauta, ação, resultado e memória.
            </p>
          </div>
          <nav
            aria-label="Navegação complementar"
            className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm font-bold"
          >
            <Link href="/comun/pautas">Pautas</Link>
            <Link href="/comun/acoes">Agenda</Link>
            <Link href="/comun/radio">Rádio</Link>
            <Link href="/comun/acervo">Acervo</Link>
            <Link href="/comun/observatorios">Observatórios</Link>
            <Link href="/comun/buscar">Buscar</Link>
            <Link href="/comun/seguranca">Segurança e privacidade</Link>
            <Link href="/comun/territorio-tomado">Sobre</Link>
          </nav>
        </div>
      </footer>
      <ComunMobileNavigation />
    </div>
  );
}

export const CommunAppShell = ComunAppShell;
