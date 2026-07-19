"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNav = [
  ["Início", "/comun"],
  ["Comunidades", "/comun/comunidades"],
  ["Participar", "/comun/participar"],
  ["Territórios", "/comun/territorios"],
  ["Minha área", "/comun/minha-participacao"],
] as const;

const memberNav = [["Caixa de entrada", "/comun/caixa-de-entrada"], ["Conta", "/comun/conta"]] as const;

function active(path: string, href: string) {
  return href === "/comun" ? path === href : path.startsWith(href);
}

export function ComunPrimaryNavigation() {
  const path = usePathname();
  return <nav aria-label="Navegação principal" className="hidden items-center gap-3 text-xs font-bold md:flex lg:gap-4 lg:text-sm">{primaryNav.map(([label, href]) => <Link aria-current={active(path, href) ? "page" : undefined} className={active(path, href) ? "text-comun-yellow underline decoration-2 underline-offset-8" : "text-comun-paper/85 hover:text-comun-yellow"} href={href} key={href}>{label}</Link>)}</nav>;
}

export function ComunMemberNavigation() {
  const path = usePathname();
  return <nav aria-label="Área pessoal" className="hidden gap-3 border-l border-comun-paper/25 pl-3 text-xs font-bold xl:flex">{memberNav.map(([label, href]) => <Link aria-current={active(path, href) ? "page" : undefined} className={active(path, href) ? "text-comun-yellow" : "text-comun-paper/70 hover:text-comun-yellow"} href={href} key={href}>{label}</Link>)}</nav>;
}

export function ComunMobileNavigation() {
  const path = usePathname();
  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-comun-black bg-comun-paper pb-[env(safe-area-inset-bottom)] md:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{primaryNav.map(([label, href]) => <Link aria-current={active(path, href) ? "page" : undefined} className={`flex min-h-14 items-center justify-center px-1 text-center text-[10px] font-black uppercase leading-tight ${active(path, href) ? "bg-comun-yellow text-comun-black" : "text-comun-asphalt"}`} href={href} key={href}>{label}</Link>)}</div></nav>;
}
