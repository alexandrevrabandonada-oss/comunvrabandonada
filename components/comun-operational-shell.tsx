import Link from "next/link";
import { BellRing, ListChecks, Menu, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

const operationNav = [
  ["Fila", "/comun/admin/operacao", ListChecks],
  ["Pautas", "/comun/admin/pautas", ShieldCheck],
  ["Pessoas", "/comun/admin/equipe", Users],
  ["Alertas", "/comun/admin/alertas", BellRing],
] as const;

export function ComunOperationalShell({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return children;
  return (
    <div
      className="min-h-screen min-h-[100dvh] bg-[var(--comun-surface-operation)] text-comun-paper"
      data-comun-shell-mode="admin"
      data-comun-app-v2-page="central-operation"
    >
      <header className="sticky top-0 z-40 border-b border-comun-paper/25 bg-comun-black px-3 pb-2 pt-[calc(.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex min-h-12 max-w-7xl items-center gap-3">
          <Link
            href="/comun/admin"
            className="grid size-11 place-items-center rounded-[var(--comun-radius-control)]"
            aria-label="Abrir administração"
          >
            <Menu aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">Central Operacional</p>
            <p className="truncate text-[11px] font-bold text-comun-paper/60">
              Área interna · dados sensíveis
            </p>
          </div>
          <p className="hidden items-center gap-2 text-xs font-black uppercase text-comun-green sm:flex">
            <span
              className="size-2 rounded-full bg-comun-green"
              aria-hidden="true"
            />{" "}
            Conectado
          </p>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[7rem_1fr]">
        <nav
          aria-label="Navegação administrativa"
          className="border-b border-comun-paper/20 bg-comun-black md:min-h-[calc(100dvh-4.25rem)] md:border-b-0 md:border-r"
        >
          <div className="flex overflow-x-auto md:sticky md:top-20 md:grid">
            {operationNav.map(([label, href, Icon], index) => (
              <Link
                key={href}
                href={href}
                aria-current={index === 0 ? "page" : undefined}
                className={`flex min-h-16 min-w-20 flex-col items-center justify-center gap-1 px-2 text-xs font-bold ${index === 0 ? "bg-comun-yellow text-comun-black" : "text-comun-paper/75"}`}
              >
                <Icon size={19} aria-hidden="true" /> {label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
