import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireComunAdminProfile } from "@/lib/admin-auth";
import { canAccessOperationalSurface } from "@/lib/operational-authorization";
import {
  getOperationalSurface,
  OPERATIONAL_SURFACES,
} from "@/lib/operational-surfaces";

export function generateStaticParams() {
  return OPERATIONAL_SURFACES.map(({ key }) => ({ surface: key }));
}

export default async function OperationalSurfacePage({
  params,
}: {
  params: Promise<{ surface: string }>;
}) {
  const { surface: key } = await params;
  const surface = getOperationalSurface(key);
  if (!surface) notFound();
  const session = await requireComunAdminProfile();
  if (!canAccessOperationalSurface(session.profile, surface.authorization))
    redirect("/comun/admin?forbidden=operational-surface");
  if (surface.state === "expired")
    redirect(
      `/comun/admin/login?redirectTo=/comun/admin/operacao/superficies/${surface.key}&reason=expired`,
    );
  return (
    <main
      className="mx-auto min-h-screen max-w-4xl bg-white p-4 text-slate-950 sm:p-6"
      data-operational-surface={surface.key}
    >
      <nav aria-label="Navegação operacional">
        <Link className="underline" href="/comun/admin/operacao">
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
      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white sm:w-auto"
      >
        {surface.action}
      </button>
    </main>
  );
}
