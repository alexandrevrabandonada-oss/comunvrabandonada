"use client";

import Link from "next/link";
import {
  Bell,
  CirclePlus,
  Compass,
  Home,
  MapPinned,
  UserRound,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { ParticipateSheet } from "./comun-experience-controls";

const primaryNav = [
  ["Início", "/comun", Home],
  ["Comunidades", "/comun/comunidades", Users],
  ["Participar", "/comun/participar", CirclePlus],
  ["Territórios", "/comun/territorios", MapPinned],
  ["Minha área", "/comun/minha-participacao", UserRound],
] as const;

const memberNav = [
  ["Caixa de entrada", "/comun/caixa-de-entrada"],
  ["Conta", "/comun/conta"],
] as const;

const mobileNav = [
  ["Início", "/comun", Home],
  ["Explorar", "/comun/explorar", Compass],
  ["Caixa", "/comun/caixa-de-entrada", Bell],
  ["Minha área", "/comun/minha-participacao", UserRound],
] as const;

function active(path: string, href: string) {
  return href === "/comun" ? path === href : path.startsWith(href);
}

export function ComunPrimaryNavigation() {
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
          href={href}
          key={href}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ComunMemberNavigation() {
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
          href={href}
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

export function ComunMobileNavigation() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-comun-black bg-comun-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        <MobileItem item={mobileNav[0]} path={path} />
        <MobileItem item={mobileNav[1]} path={path} />
        <ParticipateSheet variant="mobile-nav" />
        <MobileItem item={mobileNav[2]} path={path} />
        <MobileItem item={mobileNav[3]} path={path} />
      </div>
    </nav>
  );
}

function MobileItem({
  item,
  path,
}: {
  item: (typeof mobileNav)[number];
  path: string;
}) {
  const [label, href, Icon] = item;
  return (
    <Link
      aria-current={active(path, href) ? "page" : undefined}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-black leading-tight ${active(path, href) ? "bg-comun-yellow text-comun-black" : "text-comun-asphalt"}`}
      href={href}
    >
      <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
