import Link from "next/link";
import type { ReactNode } from "react";
import { formatComunDate } from "@/lib/comun-date";
export function ComunSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-8 sm:py-12 ${className}`}>
      {children}
    </section>
  );
}
export function ComunSectionHeader({
  title,
  intro,
  href,
  label,
  updatedAt,
}: {
  title: string;
  intro?: string;
  href?: string;
  label?: string;
  updatedAt?: string | null;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-comun-yellow pb-4">
      <div>
        <h2 className="text-2xl font-black uppercase text-comun-yellow sm:text-3xl">
          {title}
        </h2>
        {intro ? (
          <p className="mt-2 max-w-3xl text-comun-paper/75">{intro}</p>
        ) : null}
        {updatedAt ? (
          <p className="mt-2 text-xs font-bold uppercase text-comun-paper/55">
            Atualizado em {formatComunDate(updatedAt)}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          className="font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4"
          href={href}
        >
          {label ?? "Explorar"}
        </Link>
      ) : null}
    </header>
  );
}
export function ComunStatus({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex border-2 border-current px-2 py-1 text-xs font-black uppercase">
      {children}
    </span>
  );
}
export function ComunNextAction({
  children,
  href,
  label = "Ver próxima etapa",
}: {
  children: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="border-l-4 border-comun-yellow bg-comun-black p-4 text-comun-paper">
      <p className="text-xs font-black uppercase text-comun-yellow">
        Próxima ação
      </p>
      <p className="mt-1">{children}</p>
      <Link
        href={href}
        className="mt-3 inline-block font-black uppercase text-comun-yellow underline"
      >
        {label}
      </Link>
    </div>
  );
}
export function ComunEmptyState({
  children,
  href,
  label,
}: {
  children: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="border-2 border-comun-yellow bg-comun-black p-5 text-comun-paper">
      <p>{children}</p>
      {href ? (
        <Link
          className="mt-3 inline-block font-black text-comun-yellow underline"
          href={href}
        >
          {label ?? "Começar agora"}
        </Link>
      ) : null}
    </div>
  );
}
export function ComunBreadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 hidden text-sm text-comun-paper/65 lg:block"
    >
      <ol className="flex flex-wrap gap-2">
        {items.map((x, i) => (
          <li key={`${x.label}-${i}`}>
            {i ? <span aria-hidden="true">/ </span> : null}
            {x.href ? (
              <Link className="underline" href={x.href}>
                {x.label}
              </Link>
            ) : (
              <span aria-current="page">{x.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
