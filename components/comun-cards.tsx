import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flag,
  ListChecks,
  MapPinned,
  Users,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

export function ComunCommunityCard({
  href,
  name,
  purpose,
  territory,
  themes,
  relationship,
  nextAction,
  activity,
  emblem,
}: {
  href: string;
  name: string;
  purpose: string;
  territory: string;
  themes: string[];
  relationship?: string;
  nextAction: string;
  activity?: string | null;
  emblem?: ReactNode;
}) {
  return (
    <article
      className="comun-v2-card-community p-5 pt-6"
      data-comun-card="community"
    >
      <div className="relative flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-comun-paper bg-[#7d8254] text-xl font-black text-comun-black">
          {emblem ?? <Users aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="comun-v2-section-title normal-case">{name}</h2>
          <p className="mt-2 text-sm text-comun-black/70">{purpose}</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-bold">
            <MapPinned size={17} aria-hidden="true" />
            {territory} · {themes.join(" · ")}
          </p>
          {relationship ? (
            <p className="mt-3 inline-flex min-h-8 items-center rounded-[var(--comun-radius-pill)] border border-[#6c7047] px-3 text-xs font-black">
              {relationship}
            </p>
          ) : null}
        </div>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-comun-black/25 pt-4 sm:grid-cols-2">
        <div>
          <dt className="comun-v2-eyebrow text-[#60643e]">Próxima ação</dt>
          <dd className="mt-1 font-black">{nextAction}</dd>
        </div>
        {activity ? (
          <div>
            <dt className="comun-v2-eyebrow flex items-center gap-1 text-[#60643e]">
              <CalendarDays size={14} aria-hidden="true" /> Atividade
            </dt>
            <dd className="mt-1 font-black">{activity}</dd>
          </div>
        ) : null}
      </dl>
      <Link
        href={href}
        className="comun-v2-action mt-5 w-full bg-transparent shadow-none"
      >
        Conhecer comunidade <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function ComunMiniappCard({
  href,
  title,
  objective,
  territory,
  status,
  action,
  impact,
  contributionHref,
}: {
  href: string;
  title: string;
  objective: string;
  territory: string;
  status: string;
  action: string;
  impact: string;
  contributionHref?: string;
}) {
  return (
    <article className="comun-v2-card-tool p-5" data-comun-card="miniapp">
      <p className="comun-v2-eyebrow text-comun-rust">
        Ferramenta em atividade
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[5.5rem_1fr]">
        <span className="grid aspect-square size-20 place-items-center rounded-[var(--comun-radius-control)] bg-comun-black text-comun-paper">
          <Wrench size={34} aria-hidden="true" />
        </span>
        <div>
          <h2 className="comun-v2-section-title normal-case">{title}</h2>
          <p className="mt-2 text-sm text-comun-black/70">{objective}</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-bold">
            <MapPinned size={17} aria-hidden="true" /> {territory}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-[var(--comun-radius-control)] border border-comun-rust/25 bg-comun-rust/5 p-3">
        <p className="text-sm font-black">{status}</p>
        <div className="comun-v2-progress mt-2" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} data-filled={index < 7 ? "true" : "false"} />
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm font-bold">
          <Flag size={16} aria-hidden="true" /> {impact}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={href} className="comun-v2-action flex-1">
          Abrir ferramenta <ArrowRight size={18} aria-hidden="true" />
        </Link>
        {contributionHref ? (
          <Link
            href={contributionHref}
            className="inline-flex min-h-11 items-center px-2 font-black underline"
          >
            {action}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ComunPautaCard({
  href,
  title,
  summary,
  status,
  nextAction,
}: {
  href: string;
  title: string;
  summary: string;
  status: string;
  nextAction: string;
}) {
  return (
    <article className="comun-v2-card-pauta p-5" data-comun-card="pauta">
      <p className="comun-v2-status text-comun-rust">{status}</p>
      <h2 className="mt-2 text-xl font-black normal-case">{title}</h2>
      <p className="mt-2 text-sm text-comun-black/70">{summary}</p>
      <p className="mt-4 flex items-start gap-2 text-sm">
        <ListChecks className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
        <span>
          <strong>Próxima ação:</strong> {nextAction}
        </span>
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center gap-2 font-black underline"
      >
        Abrir pauta <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function ComunActionCard({
  href,
  title,
  description,
  action,
}: {
  href: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <article className="comun-v2-card-action p-5" data-comun-card="action">
      <p className="comun-v2-eyebrow">Próxima ação</p>
      <h2 className="mt-2 text-2xl font-black normal-case">{title}</h2>
      <p className="mt-2 max-w-2xl">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--comun-radius-control)] bg-comun-black px-4 font-black text-comun-paper"
      >
        {action} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function ComunResultCard({
  href,
  title,
  summary,
  verification = "Resultado verificado",
}: {
  href: string;
  title: string;
  summary: string;
  verification?: string;
}) {
  return (
    <article className="comun-v2-card-result p-5" data-comun-card="result">
      <p className="comun-v2-eyebrow flex items-center gap-2 text-comun-green">
        <CheckCircle2 size={16} aria-hidden="true" /> {verification}
      </p>
      <h2 className="mt-2 text-xl font-black normal-case">{title}</h2>
      <p className="mt-2 text-sm text-comun-black/70">{summary}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center font-black underline"
      >
        Ver consequência e fonte
      </Link>
    </article>
  );
}

export function ComunMemoryCard({
  href,
  title,
  summary,
  context = "Memória coletiva",
}: {
  href: string;
  title: string;
  summary: string;
  context?: string;
}) {
  return (
    <article className="comun-v2-card-memory p-5" data-comun-card="memory">
      <p className="comun-v2-eyebrow flex items-center gap-2 text-comun-rust">
        <Archive size={16} aria-hidden="true" /> {context}
      </p>
      <h2 className="mt-2 text-xl font-black normal-case">{title}</h2>
      <p className="mt-2 text-sm text-comun-black/70">{summary}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center font-black underline"
      >
        Abrir memória
      </Link>
    </article>
  );
}
