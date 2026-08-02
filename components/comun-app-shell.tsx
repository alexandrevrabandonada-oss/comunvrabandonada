"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { ParticipateSheet, SearchSheet } from "./comun-experience-controls";
import {
  ComunMemberNavigation,
  ComunMobileNavigation,
  ComunPrimaryNavigation,
} from "./comun-navigation";
import { ComunPwaRuntime, ComunShareButton } from "./comun-pwa-runtime";
import { ComunMobileAppBar } from "./comun-mobile-app-bar";
import type { ComunMobileAppBarProps } from "./comun-mobile-app-bar";
import {
  isComunAppV2,
  resolveComunShellContract,
} from "@/lib/comun-shell-contract";
import { resolveComunSurfaceMigration } from "@/lib/comun-surface-migration";

export function ComunAppShell({
  children,
  showSyntheticNotice = true,
  inboxBadge,
  appBar,
}: {
  children: ReactNode;
  showSyntheticNotice?: boolean;
  inboxBadge?: number | string | null;
  appBar?: Omit<ComunMobileAppBarProps, "experienceV2">;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appV2 = isComunAppV2(searchParams.get("experiencia"));
  const { route, contract } = resolveComunShellContract(pathname);
  const surface = resolveComunSurfaceMigration(pathname);

  useVisualViewportContract(appV2);

  if (!appV2)
    return (
      <div className="min-h-screen overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        <ComunPwaRuntime />
        <SkipLink />
        {showSyntheticNotice ? <SyntheticNotice /> : null}
        <DesktopHeader />
        <ComunMobileAppBar {...appBar} />
        <main id="conteudo" className="pb-24 lg:pb-0">
          {children}
        </main>
        <InstitutionalFooter />
        <ComunMobileNavigation inboxBadge={inboxBadge} />
      </div>
    );

  const showDesktopHeader = !["admin", "immersive", "auth"].includes(
    route.mode,
  );
  const showMobileAppBar = contract.appBar !== "none";
  const showFooter = contract.footer !== "none";
  const showBottomNavigation = contract.bottomNavigation === "full";

  return (
    <div
      className="comun-app-shell-v2"
      data-comun-shell-mode={route.mode}
      data-comun-shell-route-group={route.routeGroup}
      data-comun-shell-scroll={contract.scroll}
      data-comun-shell-width={contract.width}
      data-comun-surface-family={surface.family}
      data-comun-surface-wave={surface.wave}
      data-comun-surface-decision={surface.decision}
    >
      <SkipLink />
      {showSyntheticNotice && route.mode === "public_web" ? (
        <SyntheticNotice />
      ) : null}
      {showDesktopHeader ? <DesktopHeader experienceV2 /> : null}
      {showMobileAppBar ? <ComunMobileAppBar {...appBar} experienceV2 /> : null}
      <ComunPwaRuntime inlineConnectionStatus />
      <main
        id="conteudo"
        className="comun-app-shell-v2__content"
        data-bottom-navigation={showBottomNavigation ? "present" : "absent"}
      >
        {children}
      </main>
      {showFooter ? (
        <div data-comun-footer={contract.footer}>
          <InstitutionalFooter experienceV2 />
        </div>
      ) : null}
      {showBottomNavigation ? (
        <ComunMobileNavigation experienceV2 inboxBadge={inboxBadge} />
      ) : null}
    </div>
  );
}

function useVisualViewportContract(active: boolean) {
  useEffect(() => {
    if (!active || !window.visualViewport) return;
    const root = document.documentElement;
    const initialHeight = window.visualViewport.height;
    const update = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      root.style.setProperty(
        "--comun-visual-viewport-height",
        `${viewport.height}px`,
      );
      root.dataset.comunKeyboard =
        viewport.height < initialHeight * 0.76 ? "open" : "closed";
    };
    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      delete root.dataset.comunKeyboard;
      root.style.removeProperty("--comun-visual-viewport-height");
    };
  }, [active]);
}

function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only z-[100] bg-comun-yellow p-3 font-black text-comun-black focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
    >
      Pular para o conteúdo
    </a>
  );
}

function SyntheticNotice() {
  return (
    <div
      role="note"
      className="bg-comun-yellow px-4 py-1 text-center text-xs font-black text-comun-black"
    >
      Versão em preparação · acesso piloto
    </div>
  );
}

function DesktopHeader({ experienceV2 = false }: { experienceV2?: boolean }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b-2 border-comun-yellow bg-comun-black pt-[env(safe-area-inset-top)] text-comun-paper lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <Link
          href={experienceV2 ? "/comun?experiencia=app-v2" : "/comun"}
          prefetch={false}
          aria-label="COMUN VR Abandonada"
          className="max-w-32 text-lg font-black leading-none tracking-[-.05em] text-comun-paper"
        >
          COMUN<span className="text-comun-yellow">.</span>
        </Link>
        <ComunPrimaryNavigation experienceV2={experienceV2} />
        <div className="flex items-center gap-1 sm:gap-2">
          <ComunMemberNavigation experienceV2={experienceV2} />
          <ComunShareButton title="COMUN VR Abandonada" />
          <ParticipateSheet experienceV2={experienceV2} />
          <SearchSheet experienceV2={experienceV2} />
        </div>
      </div>
    </header>
  );
}

function InstitutionalFooter({
  experienceV2 = false,
}: {
  experienceV2?: boolean;
}) {
  const links = [
    ["Pautas", "/comun/pautas"],
    ["Agenda", "/comun/acoes"],
    ["Rádio", "/comun/radio"],
    ["Acervo", "/comun/acervo"],
    ["Observatórios", "/comun/observatorios"],
    ["Buscar", "/comun/buscar"],
    ["Segurança e privacidade", "/comun/seguranca"],
    ["Ajuda", "/comun/ajuda"],
    ["Sobre", "/comun/territorio-tomado"],
  ] as const;
  return (
    <footer className="comun-institutional-footer border-t-2 border-comun-black bg-comun-asphalt px-4 py-10 text-comun-paper">
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
          {links.map(([label, href]) => (
            <Link
              href={experienceV2 ? `${href}?experiencia=app-v2` : href}
              prefetch={false}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export const CommunAppShell = ComunAppShell;
