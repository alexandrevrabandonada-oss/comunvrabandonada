"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { logoutAdmin } from "@/app/actions";
import {
  adminFilterSnapshot,
  safeComunAdminReturn,
} from "@/lib/comun-admin-navigation";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-experience";
import { resolveComunSurfaceMigration } from "@/lib/comun-surface-migration";

type NotificationSummary = {
  unread: number;
  overdue: number;
  urgent: number;
};

type AdminGroup = {
  label: string;
  links: ReadonlyArray<readonly [string, string]>;
};

const ADMIN_GROUPS: readonly AdminGroup[] = [
  {
    label: "Operação cívica",
    links: [
      ["Organização", "/comun/admin/organizacao"],
      ["Comunidades", "/comun/admin/comunidades"],
      ["Território", "/comun/admin/territorio"],
      ["Pautas", "/comun/admin/pautas"],
      ["Ações", "/comun/admin/acoes"],
      ["Calçadas", "/comun/admin/calcadas"],
      ["Operação Calçadas", "/comun/admin/calcadas/operacao"],
      ["Piloto Calçadas", "/comun/admin/calcadas/piloto"],
      ["Prioridades Calçadas", "/comun/admin/calcadas/prioridade"],
      ["Vincular relato", "/comun/admin/organizacao/entrada/vincular"],
      ["Relatos", "/comun/admin/relatos"],
      ["Protocolos", "/comun/admin/protocolos-oficiais"],
      ["Resultados", "/comun/admin/dossies"],
    ],
  },
  {
    label: "Editorial e direitos",
    links: [
      ["Acervo", "/comun/admin/acervo"],
      ["Fotos recebidas", "/comun/admin/acervo/contribuicoes"],
      ["Sugestões", "/comun/admin/acervo/sugestoes"],
      ["Coleções", "/comun/admin/acervo/colecoes"],
      ["Storage", "/comun/admin/acervo/storage"],
      ["Processamento", "/comun/admin/acervo/processamento"],
      ["Arte", "/comun/admin/acervo/arte"],
      ["Rádio", "/comun/admin/radio"],
      ["Observatórios", "/comun/admin/observatorios"],
      ["Contribuições", "/comun/admin/pautas/contribuicoes"],
      ["Anexos", "/comun/admin/anexos"],
      ["Alertas", "/comun/admin/alertas"],
      ["Dossiês públicos", "/comun/dossies"],
      ["Revisões de dossiês", "/comun/admin/dossies/revisoes"],
      ["Notificações", "/comun/admin/notificacoes"],
    ],
  },
  {
    label: "Plataforma",
    links: [
      ["Central", "/comun/admin/operacao"],
      ["Observabilidade", "/comun/admin/observabilidade"],
      ["Auditoria", "/comun/admin/auditoria"],
      ["Equipe", "/comun/admin/equipe"],
      ["Lançamento", "/comun/admin/lancamento"],
    ],
  },
] as const;

export function ComunAdminShellClient({
  children,
  adminEmail,
  notificationSummary,
}: {
  children: ReactNode;
  adminEmail: string;
  notificationSummary: NotificationSummary;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appV2 = isComunAppV2(searchParams);
  const surface = resolveComunSurfaceMigration(pathname);
  const activeHref = useMemo(
    () =>
      ADMIN_GROUPS.flatMap((group) => group.links)
        .map(([, href]) => href)
        .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
        .sort((left, right) => right.length - left.length)[0],
    [pathname],
  );
  const returnHref = safeComunAdminReturn(
    searchParams.get("returnTo"),
    surface.parentHref,
  );

  useEffect(() => {
    if (!appV2) return;
    const workspace = document.querySelector<HTMLElement>("#conteudo-admin");
    for (const table of workspace?.querySelectorAll("table") ?? []) {
      if (!table.querySelector("caption") && !table.getAttribute("aria-label"))
        table.setAttribute("aria-label", `Dados de ${surface.contextualTitle}`);
      for (const header of table.querySelectorAll("th:not([scope])"))
        header.setAttribute("scope", "col");
    }
    for (const region of workspace?.querySelectorAll<HTMLElement>(
      ".overflow-x-auto, .overflow-auto",
    ) ?? []) {
      if (region.tabIndex < 0) region.tabIndex = 0;
      if (!region.getAttribute("aria-label"))
        region.setAttribute(
          "aria-label",
          `Conteúdo rolável de ${surface.contextualTitle}`,
        );
    }
    for (const field of workspace?.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), select, textarea',
    ) ?? []) {
      if (
        field.closest("label") ||
        field.getAttribute("aria-label") ||
        field.getAttribute("aria-labelledby")
      )
        continue;
      const name = field.getAttribute("name")?.replace(/[_-]+/g, " ");
      const placeholder = field.getAttribute("placeholder");
      if (placeholder || name)
        field.setAttribute("aria-label", placeholder || name || "Campo");
    }
  }, [appV2, pathname, surface.contextualTitle, surface.family]);

  if (!appV2)
    return (
      <LegacyAdminShell
        adminEmail={adminEmail}
        notificationSummary={notificationSummary}
      >
        {children}
      </LegacyAdminShell>
    );

  function preserveV2Navigation(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!anchor || anchor.target === "_blank") return;
    const target = new URL(anchor.href, window.location.href);
    if (
      target.origin !== window.location.origin ||
      !target.pathname.startsWith("/comun")
    )
      return;
    if (target.searchParams.get("experiencia") === "app-v2") return;
    const targetSurface = resolveComunSurfaceMigration(target.pathname);
    if (
      target.pathname.startsWith("/comun/admin") &&
      targetSurface.family === surface.family &&
      target.pathname !== pathname &&
      !target.searchParams.has("returnTo")
    )
      target.searchParams.set(
        "returnTo",
        adminFilterSnapshot(
          pathname,
          new URLSearchParams(window.location.search),
        ),
      );
    event.preventDefault();
    router.push(
      withComunAppV2(`${target.pathname}${target.search}${target.hash}`),
    );
  }

  return (
    <div
      className="comun-admin-shell-v2"
      data-comun-shell-mode="admin"
      data-comun-admin-domain={surface.family}
      data-comun-surface-wave={surface.wave}
      onClickCapture={preserveV2Navigation}
    >
      <a className="comun-admin-skip-link" href="#conteudo-admin">
        Pular para o conteúdo administrativo
      </a>
      <aside className="comun-admin-rail" aria-label="Navegação administrativa">
        <Link
          className="comun-admin-rail__brand"
          href={withComunAppV2("/comun/admin")}
        >
          COMUN <span>Admin</span>
        </Link>
        {ADMIN_GROUPS.map((group) => (
          <section key={group.label}>
            <h2>{group.label}</h2>
            <nav aria-label={group.label}>
              {group.links.map(([label, href]) => {
                const active = activeHref === href;
                return (
                  <Link
                    key={href}
                    href={withComunAppV2(href)}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                    {href.endsWith("/notificacoes") ? (
                      <AdminNotificationBadges summary={notificationSummary} />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
        <div className="comun-admin-rail__session">
          <p>Área interna</p>
          <p className="truncate" title={adminEmail}>
            {adminEmail}
          </p>
          <form action={logoutAdmin}>
            <button>Sair com segurança</button>
          </form>
        </div>
      </aside>
      <div className="comun-admin-workspace">
        <header className="comun-admin-context-bar">
          <div>
            <Link href={withComunAppV2(returnHref)}>← Voltar ao recorte</Link>
            <p>{surface.contextLabel}</p>
            <h1>{surface.contextualTitle}</h1>
          </div>
          <details>
            <summary>Menu</summary>
            <nav aria-label="Menu administrativo compacto">
              {ADMIN_GROUPS.flatMap((group) => group.links).map(
                ([label, href]) => (
                  <Link
                    key={href}
                    href={withComunAppV2(href)}
                    aria-current={activeHref === href ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ),
              )}
            </nav>
          </details>
        </header>
        <main id="conteudo-admin" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

function LegacyAdminShell({
  children,
  adminEmail,
  notificationSummary,
}: {
  children: ReactNode;
  adminEmail: string;
  notificationSummary: NotificationSummary;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-comun-paper text-comun-black">
      <header className="border-b-2 border-comun-black bg-comun-black text-comun-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/comun/admin"
            className="font-black uppercase text-comun-yellow"
          >
            Admin COMUN
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-black uppercase">
            {ADMIN_GROUPS.flatMap((group) => group.links).map(
              ([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                  {href.endsWith("/notificacoes") ? (
                    <AdminNotificationBadges
                      summary={notificationSummary}
                      legacy
                    />
                  ) : null}
                </Link>
              ),
            )}
            <form action={logoutAdmin}>
              <button className="text-comun-paper/70">Sair</button>
            </form>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-3 text-xs font-bold uppercase text-comun-paper/70">
          <span>Área interna - dados sensíveis</span>
          <span>{adminEmail}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function AdminNotificationBadges({
  summary,
  legacy = false,
}: {
  summary: NotificationSummary;
  legacy?: boolean;
}) {
  return (
    <span className="comun-admin-badges inline-flex items-center gap-1">
      <span
        className={`comun-admin-badge ${
          legacy
            ? "border border-comun-yellow px-1 text-[10px] text-comun-yellow"
            : ""
        }`}
        aria-label={`${summary.unread} não lidas`}
      >
        {Math.min(summary.unread, 99)}
      </span>
      {summary.overdue ? (
        <span
          className={`comun-admin-badge ${
            legacy ? "border border-red-400 px-1 text-[10px] text-red-200" : ""
          }`}
          aria-label={`${summary.overdue} vencidas`}
        >
          {Math.min(summary.overdue, 99)}
        </span>
      ) : null}
      {summary.urgent ? (
        <span
          className={`comun-admin-badge ${
            legacy
              ? "border border-orange-300 px-1 text-[10px] text-orange-200"
              : ""
          }`}
          aria-label={`${summary.urgent} urgentes`}
        >
          {Math.min(summary.urgent, 99)}
        </span>
      ) : null}
    </span>
  );
}
