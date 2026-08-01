import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  MapPinned,
  Network,
  Users,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  ComunEntityContext,
  ComunEntityKind,
  EntityAction,
  EntityRelation,
} from "@/lib/comun-entity-context";
import { withComunAppV2 } from "@/lib/comun-shell-contract";

const kindLabels: Record<ComunEntityKind, string> = {
  territory: "Território",
  community: "Comunidade",
  pauta: "Pauta",
  action: "Ação",
  miniapp: "Ferramenta",
  protocol: "Protocolo",
  result: "Resultado",
  memory: "Memória",
};

const kindIcons: Record<ComunEntityKind, typeof MapPinned> = {
  territory: MapPinned,
  community: Users,
  pauta: CircleAlert,
  action: ArrowRight,
  miniapp: Wrench,
  protocol: Network,
  result: CheckCircle2,
  memory: Archive,
};

export function ComunCollectionPage({
  kind,
  title,
  summary,
  children,
  actions,
  rail,
}: {
  kind: ComunEntityKind;
  title: string;
  summary: string;
  children: ReactNode;
  actions?: ReactNode;
  rail?: EntityRelation[];
}) {
  return (
    <main
      className="comun-v2-page"
      data-comun-app-v2-page={`${kind}-collection`}
    >
      <header className="comun-relational-collection-header">
        <p className="comun-v2-eyebrow text-comun-yellow">{kindLabels[kind]}</p>
        <h1 className="comun-v2-title mt-2 normal-case">{title}</h1>
        <p className="mt-3 max-w-2xl text-comun-paper/72">{summary}</p>
        {actions ? <div className="mt-5">{actions}</div> : null}
      </header>
      {rail?.length ? (
        <ComunRelationRail relations={rail} title="Continue pelo processo" />
      ) : null}
      <div className="mt-7">{children}</div>
    </main>
  );
}

export function ComunEntityHeader({
  context,
}: {
  context: ComunEntityContext;
}) {
  return (
    <header
      className={`comun-entity-header comun-entity-header--${context.kind}`}
    >
      <p className="comun-v2-eyebrow text-comun-yellow">
        {kindLabels[context.kind]}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="comun-v2-title normal-case">{context.title}</h1>
        {context.state ? <ComunEntityState state={context.state} /> : null}
      </div>
      {context.summary ? (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-comun-paper/78 sm:text-lg">
          {context.summary}
        </p>
      ) : null}
      {context.primaryAction ? (
        <ComunPrimaryEntityAction action={context.primaryAction} />
      ) : null}
    </header>
  );
}

export function ComunPrimaryEntityAction({ action }: { action: EntityAction }) {
  return (
    <section className="comun-primary-entity-action" aria-label="Próxima ação">
      <p className="comun-v2-eyebrow text-comun-black/60">Próxima ação</p>
      {action.description ? (
        <p className="mt-2 text-xl font-black leading-tight">
          {action.description}
        </p>
      ) : null}
      <Link className="comun-v2-action mt-4" href={withComunAppV2(action.href)}>
        {action.label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  );
}

export function ComunEntityState({ state }: { state: string }) {
  return (
    <span
      className="comun-entity-state"
      data-entity-state={state.toLowerCase()}
    >
      <span aria-hidden="true" /> {state}
    </span>
  );
}

export function ComunRelationRail({
  relations,
  title = "Este processo conecta",
}: {
  relations: EntityRelation[];
  title?: string;
}) {
  if (!relations.length) return null;
  return (
    <nav className="mt-7" aria-label={title} data-comun-relation-rail>
      <h2 className="comun-v2-eyebrow text-comun-paper/78">{title}</h2>
      <ul className="comun-relation-rail mt-3">
        {relations.map((relation) => {
          const Icon = kindIcons[relation.kind];
          return (
            <li key={`${relation.kind}:${relation.slug}`}>
              <Link
                href={withComunAppV2(relation.href)}
                className="comun-relation-chip"
                data-relation-kind={relation.kind}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{relation.title}</strong>
                  <small>
                    {kindLabels[relation.kind]}
                    {typeof relation.count === "number"
                      ? ` · ${relation.count}`
                      : ""}
                  </small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ComunRelatedSection({
  id,
  title,
  summary,
  children,
}: {
  id?: string;
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const headingId =
    id ?? `related-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="comun-related-section" aria-labelledby={headingId}>
      <header>
        <h2 id={headingId} className="comun-v2-section-title normal-case">
          {title}
        </h2>
        {summary ? (
          <p className="mt-2 max-w-2xl text-sm text-comun-paper/68">
            {summary}
          </p>
        ) : null}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ComunEmptyStateV2({
  title,
  explanation,
  related,
  action,
  secondaryActions = [],
  icon,
}: {
  title: string;
  explanation: string;
  related?: string;
  action: EntityAction;
  secondaryActions?: EntityAction[];
  icon?: ReactNode;
}) {
  return (
    <section
      className="comun-empty-state-v2"
      data-comun-empty-state="actionable"
    >
      <span className="comun-empty-state-v2__icon" aria-hidden="true">
        {icon ?? <Network />}
      </span>
      <h2 className="mt-4 text-2xl font-black leading-tight normal-case">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed">{explanation}</p>
      {related ? (
        <p className="mt-3 text-sm font-bold text-comun-black/65">{related}</p>
      ) : null}
      <Link
        className="comun-v2-action mt-5 w-full sm:w-auto"
        href={withComunAppV2(action.href)}
      >
        {action.label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
      {secondaryActions.length ? (
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-comun-black/35 pt-4">
          {secondaryActions.map((secondary) => (
            <Link
              key={secondary.href}
              href={withComunAppV2(secondary.href)}
              className="inline-flex min-h-11 items-center font-black underline underline-offset-4"
            >
              {secondary.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
