import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireComunAdminProfile } from "@/lib/admin-auth";
import { canAccessOperationalSurface } from "@/lib/operational-authorization";
import {
  getOperationalSurface,
  operationalSurfaceActionHref,
  OPERATIONAL_SURFACES,
} from "@/lib/operational-surfaces";
import { ComunOperationalShell } from "@/components/comun-operational-shell";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-experience";

export function generateStaticParams() {
  return OPERATIONAL_SURFACES.map(({ key }) => ({ surface: key }));
}

export default async function OperationalSurfacePage({
  params,
  searchParams,
}: {
  params: Promise<{ surface: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { surface: key } = await params;
  const surface = getOperationalSurface(key);
  if (!surface) notFound();
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const session = await requireComunAdminProfile();
  if (!canAccessOperationalSurface(session.profile, surface.authorization))
    redirect(
      withComunAppV2("/comun/admin?forbidden=operational-surface", appV2),
    );
  if (surface.state === "expired")
    redirect(
      withComunAppV2(
        `/comun/admin/login?redirectTo=/comun/admin/operacao/superficies/${surface.key}&reason=expired`,
        appV2,
      ),
    );
  return (
    <ComunOperationalShell
      active={appV2}
      currentPathname={`/comun/admin/operacao/superficies/${surface.key}`}
    >
      <main
        className="mx-auto min-h-screen max-w-4xl bg-white p-4 text-slate-950 sm:p-6"
        data-operational-surface={surface.key}
      >
        <nav aria-label="Navegação operacional">
          <Link
            className="underline"
            href={withComunAppV2("/comun/admin/operacao", appV2)}
          >
            Central operacional
          </Link>
        </nav>
        <header className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide">
            {surface.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{surface.title}</h1>
          <p className="mt-3 max-w-2xl">{surface.description}</p>
        </header>
        {surface.state === "error" ? (
          <section
            role="alert"
            className="mt-6 rounded-2xl border border-red-700 p-5"
          >
            <h2 className="text-xl font-semibold">
              Operação interrompida com segurança
            </h2>
            <p className="mt-2">
              Nenhuma alteração foi salva. Revise a conexão local antes de
              repetir.
            </p>
          </section>
        ) : surface.state === "empty" ? (
          <section className="mt-6 rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Nenhum item encontrado</h2>
            <p className="mt-2">
              O estado vazio é válido e não bloqueia a navegação.
            </p>
          </section>
        ) : (
          <section
            className="mt-6 grid gap-4 md:grid-cols-2"
            aria-label="Resumo operacional"
          >
            <article className="min-w-0 rounded-2xl border p-5">
              <h2 className="text-xl font-semibold">Contrato desta frente</h2>
              <dl className="mt-3 grid gap-2">
                <div>
                  <dt className="font-semibold">Responsabilidade</dt>
                  <dd>Papel mínimo: {surface.role}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Prazo</dt>
                  <dd>Indicativo, com bloqueios e retomadas registrados</dd>
                </div>
                <div>
                  <dt className="font-semibold">Privacidade</dt>
                  <dd>Conteúdo sensível permanece na fonte especializada</dd>
                </div>
              </dl>
            </article>
            <article className="min-w-0 rounded-2xl border p-5">
              <h2 className="text-xl font-semibold">Próxima ação</h2>
              <p className="mt-2">
                A decisão não é automatizada e fica registrada na trilha local.
              </p>
            </article>
          </section>
        )}
        <Link
          href={withComunAppV2(
            operationalSurfaceActionHref(surface.key),
            appV2,
          )}
          className="mt-6 inline-flex w-full justify-center rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white sm:w-auto"
        >
          {surface.action}
        </Link>
      </main>
    </ComunOperationalShell>
  );
}
