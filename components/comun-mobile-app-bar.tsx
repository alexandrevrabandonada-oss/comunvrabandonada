"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  resolveComunShellRoute,
  withComunAppV2,
} from "@/lib/comun-shell-contract";
import {
  parseComunJourneyContext,
  resolveComunJourneyReturn,
} from "@/lib/comun-journey-context";

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
    "Minha participação",
    "Continue de onde parou",
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
  experienceV2?: boolean;
};

export function ComunMobileAppBar({
  backDestination: backDestinationOverride,
  title: titleOverride,
  contextLabel: contextLabelOverride,
  actions = [],
  overflowActions = [],
  experienceV2 = false,
}: ComunMobileAppBarProps = {}) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const canonicalRoute = resolveComunShellRoute(path);
  const [, legacyTitle, legacyContextLabel, legacyBackDestination] =
    labels.find(([pattern]) => pattern.test(path)) ?? [
      /./,
      "COMUN",
      "Organização comunitária",
      "/comun",
    ];
  const routeTitle = experienceV2 ? canonicalRoute.title : legacyTitle;
  const routeContextLabel = experienceV2
    ? canonicalRoute.context
    : legacyContextLabel;
  const routeBackDestination = experienceV2
    ? canonicalRoute.parentHref
    : legacyBackDestination;
  const title = titleOverride ?? routeTitle;
  const contextLabel = contextLabelOverride ?? routeContextLabel;
  const journey = parseComunJourneyContext(searchParams);
  const backDestination =
    backDestinationOverride ??
    (experienceV2
      ? resolveComunJourneyReturn(journey, routeBackDestination)
      : routeBackDestination);
  const menuActions = [
    ...actions,
    ...overflowActions,
    { href: "/comun/buscar", label: "Buscar" },
    { href: "/comun/pautas", label: "Participar" },
  ].filter(
    (action, index, all) =>
      all.findIndex((candidate) => candidate.href === action.href) === index,
  );
  const canGoBack = experienceV2
    ? canonicalRoute.mode !== "member_root" &&
      canonicalRoute.mode !== "public_web" &&
      canonicalRoute.mode !== "institutional"
    : path !== "/comun";
  return (
    <header
      className={`sticky top-0 z-30 border-b-2 border-comun-black px-3 pb-2 pt-[calc(.5rem+env(safe-area-inset-top))] lg:hidden ${experienceV2 ? "comun-app-bar-v2 bg-comun-black text-comun-paper" : "bg-comun-paper text-comun-black"}`}
      data-comun-app-bar={experienceV2 ? "contextual-v2" : "legacy"}
    >
      <div className="flex min-h-12 items-center gap-2">
        {canGoBack ? (
          <Link
            href={withComunAppV2(backDestination, experienceV2)}
            prefetch={false}
            aria-label="Voltar"
            className="grid size-11 shrink-0 place-items-center rounded-[var(--comun-radius-control)] focus:outline focus:outline-2 focus:outline-comun-yellow"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : (
          <span className="w-1" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black normal-case">{title}</p>
          <p
            className={`truncate text-[11px] font-bold ${experienceV2 ? "text-comun-paper/65" : "text-comun-concrete"}`}
          >
            {contextLabel}
          </p>
        </div>
        <details className="relative shrink-0">
          <summary
            aria-label="Mais ações"
            className="grid size-11 cursor-pointer list-none place-items-center rounded-[var(--comun-radius-control)] focus:outline focus:outline-2 focus:outline-comun-yellow"
          >
            <MoreHorizontal aria-hidden="true" />
          </summary>
          <div className="absolute right-0 top-12 z-50 grid w-52 rounded-[var(--comun-radius-card)] border-2 border-comun-black bg-comun-paper p-2 text-comun-black shadow-[var(--comun-elevation-floating)]">
            {menuActions.map((action) => (
              <Link
                key={action.href}
                className="min-h-11 px-3 py-3 font-bold"
                href={withComunAppV2(action.href, experienceV2)}
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
