import Link from "next/link";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicOralHistories } from "@/lib/archive/oral-history";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const result = await listPublicOralHistories(filters);
  const appV2 = isComunAppV2(filters.experiencia);
  const content = result.items.length ? (
    <div className="grid gap-4 md:grid-cols-2">
      {result.items.map((row: any) => (
        <Link
          key={row.id}
          href={
            appV2
              ? withComunAppV2(`/comun/acervo/historias-orais/${row.slug}`)
              : `/comun/acervo/historias-orais/${row.slug}`
          }
          className={
            appV2
              ? "surface-memory rounded-[var(--comun-radius-cultural)] p-5 text-comun-black"
              : "paper-panel border-2 border-comun-black p-5"
          }
        >
          <p
            className={
              appV2
                ? "comun-v2-status text-comun-rust"
                : "text-xs font-black uppercase text-comun-rust"
            }
          >
            {row.city}
            {row.neighborhood ? ` · ${row.neighborhood}` : ""}
          </p>
          <h2
            className={`mt-2 text-2xl font-black ${appV2 ? "normal-case" : "uppercase"}`}
          >
            {row.title}
          </h2>
          <p className="mt-2">
            {row.comun_archive_oral_histories?.public_summary ?? row.summary}
          </p>
        </Link>
      ))}
    </div>
  ) : appV2 ? (
    <ComunEmptyStateV2
      title="Nenhuma entrevista neste recorte"
      explanation="A busca não encontrou histórias orais públicas com consentimento e revisão concluídos."
      related="Áudio e transcrição só aparecem quando as permissões de todas as pessoas participantes permitem."
      action={{ href: "/comun/acervo/historias-orais", label: "Limpar busca" }}
      secondaryActions={[
        {
          href: "/comun/acervo/historias-orais/contribuir",
          label: "Sugerir entrevista",
        },
      ]}
    />
  ) : (
    <p className="mt-6 border-2 p-4">
      Nenhuma entrevista publicada com estes filtros.
    </p>
  );

  if (appV2) {
    return (
      <ComunShell
        appBar={{
          title: "Histórias orais",
          contextLabel: "Acervo · vozes autorizadas",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Histórias orais"
          summary="Entrevistas publicadas com consentimento, revisão e preservação responsável."
          rail={[
            {
              kind: "memory",
              slug: "acervo",
              title: "Acervo",
              href: "/comun/acervo",
              source: "canonical_route",
            },
            {
              kind: "memory",
              slug: "direitos",
              title: "Direitos e retirada",
              href: "/comun/acervo/historias-orais/direitos-e-retirada",
              source: "canonical_route",
            },
          ]}
        >
          <HistoryFilters filters={filters} appV2 />
          <p className="my-5 text-sm font-bold" aria-live="polite">
            {result.total} entrevista(s) pública(s) neste recorte.
          </p>
          {content}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={withComunAppV2("/comun/acervo/historias-orais/contribuir")}
              className="comun-v2-action"
            >
              Sugerir entrevista
            </Link>
            <Link
              href={withComunAppV2(
                "/comun/acervo/historias-orais/direitos-e-retirada",
              )}
              className="inline-flex min-h-11 items-center font-black underline"
            >
              Correção e retirada
            </Link>
          </div>
        </ComunCollectionPage>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase">Histórias orais</h1>
        <p className="mt-3 text-comun-paper/80">
          Entrevistas publicadas com consentimento, revisão e preservação
          responsável.
        </p>
        <HistoryFilters filters={filters} />
        <p className="mt-4" aria-live="polite">
          {result.items.length} entrevista(s)
        </p>
        <div className="mt-6">{content}</div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/comun/acervo/historias-orais/contribuir"
            className="border-2 border-comun-black bg-comun-yellow px-4 py-3 font-black text-comun-black"
          >
            Sugerir entrevista
          </Link>
          <Link
            href="/comun/acervo/historias-orais/direitos-e-retirada"
            className="border-2 px-4 py-3 font-black"
          >
            Correção e retirada
          </Link>
        </div>
      </Section>
    </ComunShell>
  );
}

function HistoryFilters({
  filters,
  appV2 = false,
}: {
  filters: Record<string, string | undefined>;
  appV2?: boolean;
}) {
  return (
    <form
      aria-label="Buscar histórias orais"
      className={`${appV2 ? "rounded-[var(--comun-radius-cultural)] border border-comun-paper/20 p-4" : "mt-5"} grid gap-2 text-comun-black md:grid-cols-4`}
    >
      {appV2 ? <input type="hidden" name="experiencia" value="app-v2" /> : null}
      <input
        className="min-h-11 bg-comun-paper p-3"
        aria-label="Busca"
        name="q"
        defaultValue={filters.q}
        placeholder="Título, tema ou lugar"
      />
      <input
        className="min-h-11 bg-comun-paper p-3"
        aria-label="Cidade"
        name="city"
        defaultValue={filters.city}
        placeholder="Cidade"
      />
      <input
        className="min-h-11 bg-comun-paper p-3"
        aria-label="Bairro"
        name="neighborhood"
        defaultValue={filters.neighborhood}
        placeholder="Bairro"
      />
      <button className="comun-v2-action">Buscar</button>
    </form>
  );
}
