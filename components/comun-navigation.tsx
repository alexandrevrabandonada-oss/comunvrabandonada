"use client";

import Link from "next/link";
import {
  Bell,
  CirclePlus,
  Compass,
  Home,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ParticipateSheet } from "./comun-experience-controls";
import { COMUN_MOTOROLA_PRIMARY_ACTION } from "@/lib/comun-motorola-contract";
import {
  COMUN_ROOT_TABS,
  resolveComunShellRoute,
  sanitizeComunBadge,
  withComunAppV2,
  type ComunRootTab,
} from "@/lib/comun-shell-contract";

const primaryNav = [
  ["Início", "/comun", Home],
  ["Entender", "/comun/observatorios/panorama", Compass],
  ["Participar", "/comun/pautas", CirclePlus],
  ["Minha participação", "/comun/minha-participacao", UserRound],
] as const;

const memberNav = [
  ["Caixa de entrada", "/comun/caixa-de-entrada"],
  ["Conta", "/comun/conta"],
] as const;

const mobileNav = [
  ["inicio", Home],
  ["explorar", Compass],
  ["participar", CirclePlus],
  ["minha_area", UserRound],
] as const satisfies ReadonlyArray<readonly [ComunRootTab, typeof Home]>;

function active(path: string, href: string) {
  return href === "/comun" ? path === href : path.startsWith(href);
}

export function ComunPrimaryNavigation({
  experienceV2 = false,
}: {
  experienceV2?: boolean;
}) {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="hidden items-center gap-1 text-xs font-bold lg:flex lg:gap-2 lg:text-sm"
    >
      {primaryNav.map(([label, href, Icon]) => (
        <Link
          aria-current={active(path, href) ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 px-3 transition-colors ${active(path, href) ? "bg-comun-yellow text-comun-black" : "text-comun-paper/85 hover:bg-comun-paper/10 hover:text-comun-yellow"}`}
          href={withComunAppV2(href, experienceV2)}
          prefetch={false}
          key={href}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ComunMemberNavigation({
  experienceV2 = false,
}: {
  experienceV2?: boolean;
}) {
  const path = usePathname();
  return (
    <nav
      aria-label="Área pessoal"
      className="hidden items-center gap-1 border-l border-comun-paper/25 pl-2 text-xs font-bold xl:flex"
    >
      {memberNav.map(([label, href]) => (
        <Link
          aria-current={active(path, href) ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 px-2 ${active(path, href) ? "text-comun-yellow" : "text-comun-paper/70 hover:text-comun-yellow"}`}
          href={withComunAppV2(href, experienceV2)}
          prefetch={false}
          key={href}
        >
          {label === "Caixa de entrada" ? (
            <Bell size={18} aria-hidden="true" />
          ) : (
            <UserRound size={18} aria-hidden="true" />
          )}
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ComunMobileNavigation({
  experienceV2 = false,
  inboxBadge,
}: {
  experienceV2?: boolean;
  inboxBadge?: number | string | null;
}) {
  const path = usePathname();
  const route = resolveComunShellRoute(path);
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!experienceV2 || !route.rootTab) return;
    const scrollKey = `comun:app-v2:scroll:${route.rootTab}`;
    const hrefKey = `comun:app-v2:href:${route.rootTab}`;
    const storedScroll = Number(sessionStorage.getItem(scrollKey) ?? "0");
    const currentHref = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem(hrefKey, currentHref);
    if (storedScroll > 0)
      requestAnimationFrame(() => window.scrollTo({ top: storedScroll }));
  }, [experienceV2, path, route.rootTab]);

  useEffect(() => {
    if (!experienceV2) return;
    const navigation = navigationRef.current;
    if (!navigation) return;
    const root = document.documentElement;
    const updateHeight = () => {
      const height = Math.ceil(navigation.getBoundingClientRect().height);
      if (height > 0)
        root.style.setProperty(
          "--comun-bottom-nav-effective-height",
          `${height}px`,
        );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(navigation);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--comun-bottom-nav-effective-height");
    };
  }, [experienceV2]);

  const saveCurrentScroll = () => {
    if (!experienceV2 || !route.rootTab) return;
    sessionStorage.setItem(
      `comun:app-v2:scroll:${route.rootTab}`,
      String(window.scrollY),
    );
  };

  const badge = sanitizeComunBadge(inboxBadge);
  return (
    <nav
      ref={navigationRef}
      aria-label="Navegação principal"
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 border-comun-black pb-[env(safe-area-inset-bottom)] lg:hidden ${experienceV2 ? "comun-bottom-nav-v2 bg-comun-black text-comun-paper" : "bg-comun-paper"}`}
      data-comun-bottom-navigation={experienceV2 ? "app-v2" : "legacy"}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        <MobileItem
          tab="inicio"
          Icon={mobileNav[0][1]}
          currentTab={route.rootTab}
          experienceV2={experienceV2}
          onNavigate={saveCurrentScroll}
        />
        <MobileItem
          tab="explorar"
          Icon={mobileNav[1][1]}
          currentTab={route.rootTab}
          experienceV2={experienceV2}
          onNavigate={saveCurrentScroll}
        />
        {experienceV2 ? (
          <Link
            href={withComunAppV2(COMUN_MOTOROLA_PRIMARY_ACTION.href, true)}
            prefetch={false}
            aria-label={COMUN_MOTOROLA_PRIMARY_ACTION.accessibleLabel}
            className="relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-black leading-tight text-comun-yellow"
          >
            <span className="grid size-10 place-items-center rounded-full bg-comun-yellow text-comun-black shadow-[0_0_0_3px_#0b0b0a]">
              <CirclePlus size={24} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>{COMUN_MOTOROLA_PRIMARY_ACTION.mobileLabel}</span>
          </Link>
        ) : (
          <ParticipateSheet variant="mobile-nav" experienceV2={false} />
        )}
        <MobileItem
          tab="participar"
          Icon={mobileNav[2][1]}
          currentTab={route.rootTab}
          experienceV2={experienceV2}
          onNavigate={saveCurrentScroll}
        />
        <MobileItem
          tab="minha_area"
          Icon={mobileNav[3][1]}
          currentTab={route.rootTab}
          experienceV2={experienceV2}
          onNavigate={saveCurrentScroll}
          badge={badge}
        />
      </div>
    </nav>
  );
}

function MobileItem({
  tab,
  Icon,
  currentTab,
  experienceV2,
  onNavigate,
  badge,
}: {
  tab: ComunRootTab;
  Icon: typeof Home;
  currentTab?: ComunRootTab;
  experienceV2: boolean;
  onNavigate: () => void;
  badge?: string | null;
}) {
  const item = COMUN_ROOT_TABS[tab];
  const isActive = currentTab === tab;
  const href = withComunAppV2(item.href, experienceV2);
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-black leading-tight ${experienceV2 ? (isActive ? "text-comun-yellow" : "text-comun-paper/80") : isActive ? "bg-comun-yellow text-comun-black" : "text-comun-asphalt"}`}
      href={href}
      prefetch={false}
      onClick={(event) => {
        onNavigate();
        if (experienceV2 && !isActive) {
          const preserved = sessionStorage.getItem(`comun:app-v2:href:${tab}`);
          if (preserved && preserved !== href) {
            event.preventDefault();
            window.location.assign(preserved);
            return;
          }
        }
        if (!experienceV2 || !isActive) return;
        event.preventDefault();
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        sessionStorage.setItem(`comun:app-v2:scroll:${tab}`, "0");
      }}
    >
      <span
        className={
          experienceV2 && isActive
            ? "grid size-8 place-items-center rounded-[var(--comun-radius-control)] bg-comun-yellow text-comun-black"
            : "grid size-8 place-items-center"
        }
      >
        <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span>{item.label}</span>
      {badge ? (
        <span
          className="absolute right-[18%] top-1 min-w-5 rounded-full bg-comun-red px-1 text-[10px] leading-5 text-white"
          aria-label={`${badge} itens não lidos`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
