"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Array<[RegExp, string, string, string]> = [
  [
    /\/calcadas\/registros\//,
    "Registro",
    "Volta Redonda · Calçadas",
    "/comun/calcadas",
  ],
  [
    /\/calcadas/,
    "Calçadas",
    "Volta Redonda · pauta vinculada",
    "/comun/pautas/calcadas-em-circulacao",
  ],
  [/\/pautas\//, "Pauta", "Processo comunitário", "/comun/c/cidade"],
  [/\/c\//, "Comunidade", "Quem organiza", "/comun/territorios/volta-redonda"],
  [/\/territorios\//, "Território", "Onde acontece", "/comun/explorar"],
  [/\/caixa-de-entrada/, "Caixa", "Mudanças que pedem atenção", "/comun"],
  [
    /\/minha-participacao/,
    "Minha área",
    "Sua relação com os processos",
    "/comun",
  ],
  [/\/explorar/, "Explorar", "Territórios, comunidades e pautas", "/comun"],
];

type AppBarAction = { href: string; label: string };

export type ComunMobileAppBarProps = {
  backDestination?: string;
  title?: string;
  contextLabel?: string;
  actions?: AppBarAction[];
  overflowActions?: AppBarAction[];
};

export function ComunMobileAppBar({
  backDestination: backDestinationOverride,
  title: titleOverride,
  contextLabel: contextLabelOverride,
  actions = [],
  overflowActions = [],
}: ComunMobileAppBarProps = {}) {
  const path = usePathname();
  const [, routeTitle, routeContextLabel, routeBackDestination] = labels.find(
    ([pattern]) => pattern.test(path),
  ) ?? [/./, "COMUN", "Organização comunitária", "/comun"];
  const title = titleOverride ?? routeTitle;
  const contextLabel = contextLabelOverride ?? routeContextLabel;
  const backDestination = backDestinationOverride ?? routeBackDestination;
  const menuActions = [
    ...actions,
    ...overflowActions,
    { href: "/comun/buscar", label: "Buscar" },
    { href: "/comun/participar", label: "Todas as ações" },
  ].filter(
    (action, index, all) =>
      all.findIndex((candidate) => candidate.href === action.href) === index,
  );
  const canGoBack = path !== "/comun";
  return (
    <header className="sticky top-0 z-30 border-b-2 border-comun-black bg-comun-paper px-3 py-2 text-comun-black lg:hidden">
      <div className="flex min-h-12 items-center gap-2">
        {canGoBack ? (
          <Link
            href={backDestination}
            prefetch={false}
            aria-label="Voltar"
            className="grid size-11 shrink-0 place-items-center rounded-lg focus:outline focus:outline-2 focus:outline-comun-rust"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{title}</p>
          <p className="truncate text-[11px] font-bold text-comun-concrete">
            {contextLabel}
          </p>
        </div>
        <details className="relative shrink-0">
          <summary
            aria-label="Mais ações"
            className="grid size-11 cursor-pointer list-none place-items-center rounded-lg focus:outline focus:outline-2 focus:outline-comun-rust"
          >
            <MoreHorizontal aria-hidden="true" />
          </summary>
          <div className="absolute right-0 top-12 z-50 grid w-48 border-2 border-comun-black bg-comun-paper p-2 shadow-mural">
            {menuActions.map((action) => (
              <Link
                key={action.href}
                className="min-h-11 px-3 py-3 font-bold"
                href={action.href}
                prefetch={false}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
