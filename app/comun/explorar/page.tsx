import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunStatePanel } from "@/components/comun-state-panel";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { isComunObservatoriesFoundationEnabled } from "@/lib/comun-observatory-feature";

type ExploreCategory = readonly [
  string,
  string,
  string,
  (
    | "territorios"
    | "comunidades"
    | "pautas"
    | "ferramentas"
    | "resultados"
    | "acervo"
    | "radio"
    | "arte"
    | "observatorios"
  ),
];

const categories: readonly ExploreCategory[] = [
  [
    "Territórios",
    "Onde os processos acontecem.",
    "/comun/territorios",
    "territorios",
  ],
  [
    "Comunidades",
    "Quem acompanha e organiza.",
    "/comun/comunidades",
    "comunidades",
  ],
  [
    "Pautas",
    "Problemas, propostas e próximos passos.",
    "/comun/pautas",
    "pautas",
  ],
  [
    "Ferramentas",
    "Como agir em processos concretos.",
    "/comun/calcadas",
    "ferramentas",
  ],
  [
    "Resultados",
    "O que mudou e como foi verificado.",
    "/comun/resultados",
    "resultados",
  ],
  ["Acervo", "O que permanece na memória coletiva.", "/comun/acervo", "acervo"],
  [
    "Rádio",
    "Vozes, programas e escuta do território.",
    "/comun/radio",
    "radio",
  ],
  [
    "Arte",
    "Obras territoriais, autoria e contexto.",
    "/comun/acervo/arte",
    "arte",
  ],
] as const;

const observatoriesCategory: ExploreCategory = [
  "Observatórios",
  "Dados públicos e informações revisadas sobre o território.",
  "/comun/observatorios",
  "observatorios",
] as const;

const categorySurfaces: Record<ExploreCategory[3], string> = {
  territorios:
    "surface-base rounded-[var(--comun-radius-cultural)] border-comun-black text-comun-paper",
  comunidades:
    "surface-community rounded-[var(--comun-radius-community)] border-comun-black/25",
  pautas:
    "surface-paper rounded-[var(--comun-radius-card)] border-comun-black/25",
  ferramentas:
    "surface-tool rounded-[var(--comun-radius-control)] border-comun-rust border-l-[.5rem]",
  resultados:
    "surface-result rounded-[var(--comun-radius-card)] border-comun-black/20",
  acervo:
    "surface-memory rounded-[var(--comun-radius-cultural)] border-comun-black/20",
  radio:
    "surface-action rounded-[var(--comun-radius-cultural)] border-comun-black/25",
  arte: "surface-memory rounded-[var(--comun-radius-community)] border-comun-rust/40",
  observatorios:
    "surface-result rounded-[var(--comun-radius-card)] border-comun-yellow/70",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const availableCategories = isComunObservatoriesFoundationEnabled()
    ? [...categories, observatoriesCategory]
    : categories;
  if (appV2)
    return <ExploreAppV2 params={params} categories={availableCategories} />;
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Explorar
        </h1>
        <p className="mt-3 max-w-2xl text-comun-paper/75">
          Encontre um lugar, um grupo, um problema, uma ferramenta ou uma
          memória.
        </p>
        <form
          action="/comun/buscar"
          className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]"
        >
          <label className="sr-only" htmlFor="explorar-q">
            Buscar no COMUN
          </label>
          <input
            id="explorar-q"
            name="q"
            className="min-h-12 border-2 border-comun-paper bg-white px-3 text-comun-black"
            placeholder="Território, comunidade, pauta…"
          />
          <button className="min-h-12 border-2 border-comun-yellow px-5 font-black uppercase text-comun-yellow">
            Buscar
          </button>
        </form>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {availableCategories.map(([title, description, href]) => (
            <Link
              key={href}
              href={href}
              aria-label={title}
              className="min-h-28 border-2 border-comun-yellow p-5 focus:outline focus:outline-4 focus:outline-comun-paper"
            >
              <strong className="text-xl uppercase text-comun-yellow">
                {title}
              </strong>
              <span className="mt-2 block text-sm text-comun-paper/75">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}

function ExploreAppV2({
  params,
  categories: availableCategories,
}: {
  params: SearchParams;
  categories: readonly ExploreCategory[];
}) {
  const category =
    typeof params.categoria === "string" ? params.categoria : "tudo";
  const activeCategories =
    category === "tudo"
      ? availableCategories
      : availableCategories.filter((item) => item[3] === category);
  return (
    <ComunShell>
      <div className="comun-v2-page" data-comun-app-v2-page="explore">
        <h1 className="sr-only">Explorar</h1>
        <form
          action="/comun/buscar"
          className="grid gap-2 sm:grid-cols-[1fr_auto]"
        >
          <label className="sr-only" htmlFor="explore-v2-search">
            Buscar no COMUN
          </label>
          <input
            id="explore-v2-search"
            name="q"
            defaultValue={typeof params.q === "string" ? params.q : ""}
            className="min-h-12 rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-comun-black px-4 text-comun-paper placeholder:text-comun-paper/55"
            placeholder="Território, comunidade, pauta…"
          />
          <button className="comun-v2-action">Buscar</button>
        </form>

        <nav
          aria-label="Filtros principais"
          className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <FilterChip label="Tudo" value="tudo" active={category === "tudo"} />
          {availableCategories.slice(0, 5).map(([title, , , value]) => (
            <FilterChip
              key={value}
              label={title}
              value={value}
              active={category === value}
            />
          ))}
        </nav>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm font-bold">
            {activeCategories.length} grupos de resultados
          </p>
          <details className="relative">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--comun-radius-control)] px-2 font-black">
              <SlidersHorizontal size={18} aria-hidden="true" /> Filtros
              avançados
            </summary>
            <div className="absolute right-0 z-20 mt-2 grid w-64 gap-2 rounded-[var(--comun-radius-card)] border-2 border-comun-black bg-comun-paper p-3 shadow-[var(--comun-elevation-floating)]">
              <Link
                className="min-h-11 py-2 font-bold"
                href={withComunAppV2("/comun/comunidades?acao=aberta")}
              >
                Comunidades com ação aberta
              </Link>
              <Link
                className="min-h-11 py-2 font-bold"
                href={withComunAppV2("/comun/comunidades?tema=mobilidade")}
              >
                Tema: mobilidade
              </Link>
              <Link
                className="min-h-11 py-2 font-bold"
                href={withComunAppV2("/comun/resultados")}
              >
                Somente resultados
              </Link>
            </div>
          </details>
        </div>

        {category !== "tudo" ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="comun-v2-chip surface-action">
              {availableCategories.find((item) => item[3] === category)?.[0] ??
                category}
            </span>
            <Link
              href={withComunAppV2("/comun/explorar")}
              className="inline-flex min-h-11 items-center font-black underline"
            >
              Limpar filtros
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          {activeCategories.map(([title, description, href, value]) => (
            <Link
              key={href}
              href={withComunAppV2(href)}
              aria-label={title}
              className={`${categorySurfaces[value]} flex min-h-24 items-center justify-between gap-4 border p-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-comun-yellow`}
            >
              <span>
                <strong className="block text-xl normal-case">{title}</strong>
                <span className="mt-1 block text-sm opacity-70">
                  {description}
                </span>
              </span>
              <span aria-hidden="true" className="text-xl">
                →
              </span>
            </Link>
          ))}
        </div>
        {!activeCategories.length ? (
          <div className="mt-6">
            <ComunStatePanel
              state="empty"
              actionHref={withComunAppV2("/comun/explorar")}
              actionLabel="Limpar recorte"
            >
              Este filtro não existe ou deixou de estar disponível. Nenhum
              conteúdo privado foi consultado; volte ao recorte público.
            </ComunStatePanel>
          </div>
        ) : null}
      </div>
    </ComunShell>
  );
}

function FilterChip({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <Link
      href={withComunAppV2(
        `/comun/explorar${value === "tudo" ? "" : `?categoria=${value}`}`,
      )}
      className="comun-v2-chip"
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
