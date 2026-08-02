import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  ComunEntityContext,
  EntityAction,
} from "@/lib/comun-entity-context";
import { withComunAppV2 } from "@/lib/comun-experience";
import { ComunEntityHeader } from "./comun-relational";

type SurfaceFrameProps = {
  title: string;
  summary?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function ComunEntityPage({
  context,
  children,
}: {
  context: ComunEntityContext;
  children: ReactNode;
}) {
  return (
    <article className="comun-v2-page" data-comun-app-v2-page="entity">
      <ComunEntityHeader context={context} />
      <div className="mt-7">{children}</div>
    </article>
  );
}

export function ComunAdminPage(props: SurfaceFrameProps) {
  return <SurfaceFrame {...props} kind="admin" />;
}

export function ComunInstitutionalPage(props: SurfaceFrameProps) {
  return <SurfaceFrame {...props} kind="institutional" />;
}

export function ComunAuthPage(props: SurfaceFrameProps) {
  return <SurfaceFrame {...props} kind="auth" />;
}

function SurfaceFrame({
  title,
  summary,
  eyebrow,
  actions,
  children,
  kind,
}: SurfaceFrameProps & { kind: "admin" | "institutional" | "auth" }) {
  return (
    <article
      className={`comun-v2-page comun-${kind}-page`}
      data-comun-app-v2-page={kind}
    >
      <header className={`comun-${kind}-page__header`}>
        {eyebrow ? <p className="comun-v2-eyebrow">{eyebrow}</p> : null}
        <h1 className="comun-v2-title mt-2 normal-case">{title}</h1>
        {summary ? (
          <p className="mt-3 max-w-3xl leading-relaxed">{summary}</p>
        ) : null}
        {actions ? <div className="mt-5">{actions}</div> : null}
      </header>
      <div className="mt-7">{children}</div>
    </article>
  );
}

export function ComunImmersiveSurface({
  title,
  description,
  backHref,
  controls,
  alternative,
  children,
}: {
  title: string;
  description: string;
  backHref: string;
  controls?: ReactNode;
  alternative: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="comun-immersive-surface"
      aria-labelledby="comun-immersive-title"
      data-comun-app-v2-page="immersive"
    >
      <header className="comun-immersive-surface__bar">
        <Link href={withComunAppV2(backHref)} aria-label="Sair da ferramenta">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <h1 id="comun-immersive-title" className="font-black normal-case">
            {title}
          </h1>
          <p className="text-xs">{description}</p>
        </div>
        {controls}
      </header>
      <div className="comun-immersive-surface__canvas">{children}</div>
      <div className="comun-immersive-surface__alternative">{alternative}</div>
    </section>
  );
}

export function ComunFilterBar({
  label = "Filtros",
  activeFilters,
  children,
}: {
  label?: string;
  activeFilters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="comun-filter-bar" aria-label={label}>
      <div className="flex items-center gap-2 font-black">
        <SlidersHorizontal size={18} aria-hidden="true" /> {label}
      </div>
      <div className="comun-filter-bar__controls">{children}</div>
      {activeFilters ? (
        <div className="comun-filter-bar__active" aria-live="polite">
          {activeFilters}
        </div>
      ) : null}
    </section>
  );
}

export function ComunErrorStateV2({
  title,
  explanation,
  action,
  returnAction,
}: {
  title: string;
  explanation: string;
  action?: EntityAction;
  returnAction: EntityAction;
}) {
  return (
    <section className="comun-error-state-v2" role="alert">
      <CircleAlert aria-hidden="true" />
      <h2 className="mt-3 text-xl font-black normal-case">{title}</h2>
      <p className="mt-2">{explanation}</p>
      <ComunPageActions
        primary={action ?? returnAction}
        secondary={action ? [returnAction] : []}
      />
    </section>
  );
}

export function ComunStatusSummary({
  label,
  status,
  explanation,
  live = false,
}: {
  label: string;
  status: string;
  explanation?: string;
  live?: boolean;
}) {
  return (
    <section
      className="comun-status-summary"
      aria-live={live ? "polite" : undefined}
    >
      <p className="comun-v2-eyebrow">{label}</p>
      <p className="mt-1 text-lg font-black normal-case">{status}</p>
      {explanation ? <p className="mt-1 text-sm">{explanation}</p> : null}
    </section>
  );
}

export function ComunPageActions({
  primary,
  secondary = [],
}: {
  primary: EntityAction;
  secondary?: EntityAction[];
}) {
  return (
    <nav className="comun-page-actions" aria-label="Ações da página">
      <Link className="comun-v2-action" href={withComunAppV2(primary.href)}>
        {primary.label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
      {secondary.map((action) => (
        <Link key={action.href} href={withComunAppV2(action.href)}>
          {action.label}
        </Link>
      ))}
    </nav>
  );
}
