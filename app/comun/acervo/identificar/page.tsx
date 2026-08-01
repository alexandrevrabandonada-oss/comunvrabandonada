import Image from "next/image";
import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { listIdentificationItems } from "@/lib/archive-identification";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";
const states = [
  ["", "Todas"],
  ["unidentified", "Sem identificação"],
  ["has_clues", "Com pistas"],
  ["under_review", "Em pesquisa"],
  ["partially_identified", "Parcialmente identificadas"],
  ["identified", "Identificadas"],
  ["disputed", "Com divergência"],
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listIdentificationItems({
    page,
    q: params.q,
    state: params.state,
  });
  const appV2 = isComunAppV2(params.experiencia);
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Identificar memórias",
          contextLabel: "Acervo · colaboração revisada",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Memórias em identificação"
          summary="Fotografias históricas abertas à memória da comunidade. Títulos são provisórios e contribuições passam por moderação."
          rail={[
            {
              kind: "memory",
              slug: "acervo",
              title: "Acervo editorial",
              href: "/comun/acervo",
              source: "canonical_route",
            },
            {
              kind: "memory",
              slug: "direitos",
              title: "Direitos e retirada",
              href: "/comun/acervo/direitos-e-remocao",
              source: "canonical_route",
            },
          ]}
        >
          <form className="grid gap-3 rounded-[var(--comun-radius-cultural)] border border-comun-paper/20 p-4 sm:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="experiencia" value="app-v2" />
            <label className="grid gap-1 text-sm font-black">
              Buscar
              <input
                name="q"
                defaultValue={params.q || ""}
                placeholder="Rua, prédio, evento…"
                className="min-h-12 bg-comun-paper p-3 font-normal text-comun-black"
              />
            </label>
            <label className="grid gap-1 text-sm font-black">
              Estado
              <select
                name="state"
                defaultValue={params.state || ""}
                className="min-h-12 bg-comun-paper p-3 font-normal text-comun-black"
              >
                {states.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="comun-v2-action self-end">Filtrar</button>
          </form>
          <p className="my-5 text-sm font-bold">
            {result.total} memória(s) nesta campanha e neste recorte de estado.
          </p>
          {!result.campaign ? (
            <ComunEmptyStateV2
              title="Campanha ainda não aberta"
              explanation="A identificação colaborativa depende de campanha pública, direitos e material revisado."
              action={{ href: "/comun/acervo", label: "Explorar o Acervo" }}
              secondaryActions={[
                { href: "/comun/acervo/contribuir", label: "Como contribuir" },
              ]}
            />
          ) : result.items.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item: any) => (
                <Link
                  href={withComunAppV2(
                    `/comun/acervo/identificar/${item.public_slug}`,
                  )}
                  key={item.id}
                  className="surface-memory overflow-hidden rounded-[var(--comun-radius-cultural)] p-3 text-comun-black focus:outline focus:outline-4 focus:outline-comun-yellow"
                >
                  {item.preview_url ? (
                    <Image
                      src={item.preview_url}
                      alt="Fotografia histórica de Volta Redonda em identificação"
                      unoptimized
                      width={item.preview_width || 800}
                      height={item.preview_height || 600}
                      className="aspect-[4/3] w-full rounded-[var(--comun-radius-control)] bg-comun-black object-contain"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-comun-black p-4 text-center text-comun-paper">
                      Restauração técnica pendente
                    </div>
                  )}
                  <p className="comun-v2-status mt-3 text-comun-rust">
                    {stateLabel(item.research_state)} · {item.comment_count}{" "}
                    contribuição(ões) públicas
                  </p>
                  <h2 className="mt-1 text-xl font-black normal-case">
                    {item.public_title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-comun-black/70">
                    {item.public_prompt}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma memória neste recorte"
              explanation="O filtro atual não encontrou itens públicos da campanha."
              action={{
                href: "/comun/acervo/identificar",
                label: "Limpar filtros",
              }}
              secondaryActions={[
                { href: "/comun/acervo", label: "Voltar ao Acervo" },
              ]}
            />
          )}
          {result.pages > 1 ? (
            <nav aria-label="Paginação" className="mt-8 flex flex-wrap gap-2">
              {Array.from(
                { length: result.pages },
                (_, index) => index + 1,
              ).map((number) => (
                <Link
                  key={number}
                  aria-current={number === result.page ? "page" : undefined}
                  className="comun-v2-chip"
                  href={withComunAppV2(
                    `/comun/acervo/identificar?page=${number}&q=${encodeURIComponent(params.q || "")}&state=${encodeURIComponent(params.state || "")}`,
                  )}
                >
                  {number}
                </Link>
              ))}
            </nav>
          ) : null}
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <Section>
        <p className="text-sm font-black uppercase text-comun-yellow">
          Acervo colaborativo
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase sm:text-6xl">
          Memórias em identificação
        </h1>
        <p className="mt-4 max-w-3xl text-comun-paper/75">
          Fotografias históricas de Volta Redonda abertas à memória da
          comunidade. Os títulos são provisórios e as contribuições passam por
          moderação antes de aparecer.
        </p>
        <div className="mt-5 border-2 border-comun-yellow p-4">
          <b className="uppercase text-comun-yellow">
            Autoria e contexto em identificação
          </b>
          <p className="mt-1 text-sm">
            As prévias têm exibição autorizada ao COMUN. Conhece a autoria ou
            precisa solicitar crédito, correção ou retirada?{" "}
            <Link
              className="font-black underline"
              href="/comun/acervo/direitos-e-remocao"
            >
              Use o canal de direitos
            </Link>
            .
          </p>
        </div>
        <form className="mt-7 grid gap-3 border-2 border-comun-paper/30 p-4 sm:grid-cols-[1fr_auto_auto]">
          <label className="grid gap-1 text-sm font-black uppercase">
            Buscar
            <input
              name="q"
              defaultValue={params.q || ""}
              className="min-h-12 bg-white p-3 font-normal normal-case text-comun-black"
            />
          </label>
          <label className="grid gap-1 text-sm font-black uppercase">
            Estado
            <select
              name="state"
              defaultValue={params.state || ""}
              className="min-h-12 bg-white p-3 font-normal normal-case text-comun-black"
            >
              {states.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-12 self-end bg-comun-yellow px-5 font-black uppercase text-comun-black">
            Filtrar
          </button>
        </form>
        <p className="mt-5 text-sm">
          {result.total} memória(s) disponível(is) para identificação.
        </p>
        {!result.campaign ? (
          <p className="mt-8 border-2 p-5">A campanha ainda não está aberta.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item: any) => (
              <Link
                href={`/comun/acervo/identificar/${item.public_slug}`}
                key={item.id}
                className="group border-2 border-comun-paper/25 bg-comun-asphalt/40 p-3 focus:outline-none focus:ring-4 focus:ring-comun-yellow"
              >
                {item.preview_url ? (
                  <Image
                    src={item.preview_url}
                    alt="Fotografia histórica de Volta Redonda em identificação"
                    unoptimized
                    width={item.preview_width || 800}
                    height={item.preview_height || 600}
                    className="aspect-[4/3] w-full bg-black object-contain"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center bg-comun-black p-4 text-center">
                    Restauração técnica pendente
                  </div>
                )}
                <p className="mt-3 text-xs font-black uppercase text-comun-yellow">
                  {stateLabel(item.research_state)} · {item.comment_count}{" "}
                  contribuição(ões)
                </p>
                <h2 className="mt-1 text-xl font-black group-hover:underline">
                  {item.public_title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-comun-paper/70">
                  {item.public_prompt}
                </p>
              </Link>
            ))}
          </div>
        )}
        {result.pages > 1 ? (
          <nav aria-label="Paginação" className="mt-8 flex flex-wrap gap-2">
            {Array.from({ length: result.pages }, (_, index) => index + 1).map(
              (number) => (
                <Link
                  key={number}
                  aria-current={number === result.page ? "page" : undefined}
                  className={`grid size-11 place-items-center border-2 ${number === result.page ? "bg-comun-yellow text-comun-black" : "border-comun-yellow"}`}
                  href={`?page=${number}&q=${encodeURIComponent(params.q || "")}&state=${encodeURIComponent(params.state || "")}`}
                >
                  {number}
                </Link>
              ),
            )}
          </nav>
        ) : null}
      </Section>
    </ComunShell>
  );
}

function stateLabel(value: string) {
  return (
    (
      {
        unidentified: "Sem identificação",
        has_clues: "Com pistas",
        under_review: "Em pesquisa",
        partially_identified: "Identificação parcial",
        identified: "Identificada",
        disputed: "Com divergência",
      } as Record<string, string>
    )[value] || value
  );
}
