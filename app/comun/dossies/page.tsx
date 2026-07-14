import Link from "next/link";
import type { Metadata } from "next";
import { ComunShell, Section } from "@/components/comun-shell";
import { StatusLabel } from "@/components/status-label";
import { listPublicDossierRecommendations, listPublishedPautaDossiers, type PublicDossierFeatureWithSnapshot, type PublishedPautaDossierSnapshot } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dossies publicados | COMUN",
  description: "Indice publico seguro de dossies comunitarios publicados pelo COMUN.",
  alternates: { canonical: "/comun/dossies" },
  openGraph: {
    title: "Dossies publicados | COMUN",
    description: "Indice publico seguro de dossies comunitarios publicados pelo COMUN.",
    url: "/comun/dossies",
    siteName: "COMUN VR Abandonada",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dossies publicados | COMUN",
    description: "Indice publico seguro de dossies comunitarios publicados pelo COMUN.",
  },
};

type DossierIndexSearchParams = {
  pauta?: string;
  comunidade?: string;
  categoria?: string;
  busca?: string;
  ordem?: string;
};

export default async function DossiersPage(props: { searchParams?: Promise<DossierIndexSearchParams> }) {
  const searchParams = await props.searchParams;
  const [dossiers, recommendations] = await Promise.all([listPublishedPautaDossiers(), listPublicDossierRecommendations()]);
  const filters = normalizeFilters(searchParams ?? {});
  const filtered = filterDossiers(dossiers, filters);
  const sorted = sortDossiers(filtered, filters.ordem);
  const options = buildFilterOptions(dossiers);

  return (
    <ComunShell>
      <Section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <h1 className="text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Dossies publicados</h1>
            <p className="comun-prose mt-3 max-w-3xl text-comun-paper/75">
              Sinteses comunitarias publicadas a partir de evidencias revisadas. A listagem mostra apenas versoes publicas ativas.
            </p>
          </div>
          <aside className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/78">
            Use os filtros para encontrar dossies por pauta, comunidade, categoria ou atualizacao publica.
          </aside>
        </div>

        <form className="mt-6 grid gap-3 border-2 border-comun-yellow bg-comun-black p-4 text-comun-paper md:grid-cols-5" action="/comun/dossies">
          <label className="grid gap-1 text-xs font-black uppercase">
            Busca publica
            <input name="busca" defaultValue={filters.busca} className="min-h-11 border-2 border-comun-yellow bg-comun-paper px-3 text-comun-black" />
          </label>
          <SelectFilter name="pauta" label="Pauta" value={filters.pauta} options={options.pautas} />
          <SelectFilter name="comunidade" label="Comunidade" value={filters.comunidade} options={options.comunidades} />
          <SelectFilter name="categoria" label="Categoria" value={filters.categoria} options={options.categorias} />
          <label className="grid gap-1 text-xs font-black uppercase">
            Ordenacao
            <select name="ordem" defaultValue={filters.ordem} className="min-h-11 border-2 border-comun-yellow bg-comun-paper px-2 text-comun-black">
              <option value="recentes">Mais recentes</option>
              <option value="atualizados">Atualizados recentemente</option>
            </select>
          </label>
          <button className="min-h-11 border-2 border-comun-yellow bg-comun-yellow font-black uppercase text-comun-black md:col-span-5">Filtrar dossies</button>
        </form>

        <div className="mt-4 text-sm font-bold text-comun-paper/70">
          {sorted.length ? `${sorted.length} dossie(s) publicado(s)` : filters.hasAny ? "Nenhum dossie publicado encontrado para estes filtros." : "Nenhum dossie publicado no momento."}
        </div>

        {!filters.hasAny ? (
          <div className="mt-6 grid gap-6">
            <FeatureSection features={recommendations.featured} />
            <CompactDossierSection title="Mais recentes" dossiers={recommendations.recent} filters={filters} />
            <CompactDossierSection title="Atualizados recentemente" dossiers={recommendations.recentlyUpdated} filters={filters} />
            <GroupedDossierSection title="Por pauta" groups={recommendations.byPauta} param="pauta" filters={filters} />
            <GroupedDossierSection title="Por comunidade" groups={recommendations.byCommunity} param="comunidade" filters={filters} />
            <GroupedDossierSection title="Por categoria" groups={recommendations.byCategory} param="categoria" filters={filters} />
          </div>
        ) : null}

        {sorted.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {sorted.map((dossier) => <DossierCard key={dossier.id} dossier={dossier} filters={filters} />)}
          </div>
        ) : (
          <p className="mt-6 border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
            {filters.hasAny
              ? "Nao encontramos dossies publicados com esses filtros. Ajuste a busca ou remova algum filtro."
              : "Ainda nao ha dossies publicados para leitura publica."}
          </p>
        )}
      </Section>
    </ComunShell>
  );
}

function FeatureSection({ features }: { features: PublicDossierFeatureWithSnapshot[] }) {
  if (!features.length) {
    return (
      <section className="border-2 border-comun-yellow bg-comun-black p-4">
        <h2 className="text-xl font-black uppercase text-comun-yellow">Dossies em destaque</h2>
        <p className="mt-2 text-sm text-comun-paper/70">Ainda nao ha destaques publicos ativos.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-2xl font-black uppercase text-comun-yellow">Dossies em destaque</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {features.slice(0, 6).map((feature) => (
          <Link key={feature.id} href={`/comun/dossies/${feature.snapshot.public_slug}`} className="paper-panel border-2 border-comun-black p-4">
            <p className="text-xs font-black uppercase text-comun-rust">{feature.public_label || "Destaque publico"}</p>
            <h3 className="comun-prose mt-2 font-black uppercase">{feature.snapshot.public_title}</h3>
            <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{feature.public_note || feature.snapshot.public_summary}</p>
            <p className="mt-3 text-xs font-black uppercase text-comun-asphalt/55">{feature.snapshot.public_version_label || "Versao revisada"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompactDossierSection({ title, dossiers, filters }: { title: string; dossiers: PublishedPautaDossierSnapshot[]; filters: ReturnType<typeof normalizeFilters> }) {
  if (!dossiers.length) return null;
  return (
    <section>
      <h2 className="text-2xl font-black uppercase text-comun-yellow">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {dossiers.slice(0, 6).map((dossier) => <DossierCard key={`${title}-${dossier.id}`} dossier={dossier} filters={filters} />)}
      </div>
    </section>
  );
}

function GroupedDossierSection({ title, groups, param, filters }: { title: string; groups: Array<{ key: string; title: string; dossiers: PublishedPautaDossierSnapshot[] }>; param: "pauta" | "comunidade" | "categoria"; filters: ReturnType<typeof normalizeFilters> }) {
  if (!groups.length) return null;
  return (
    <section>
      <h2 className="text-2xl font-black uppercase text-comun-yellow">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={`${title}-${group.key}`} className="border-2 border-comun-yellow bg-comun-black p-4">
            <h3 className="text-lg font-black uppercase text-comun-yellow">{group.title}</h3>
            <Link href={`/comun/dossies?${filterHref(param, group.title, filters)}`} className="mt-2 inline-block text-xs font-black uppercase text-comun-paper underline decoration-comun-yellow decoration-2 underline-offset-2">Ver recorte</Link>
            <div className="mt-3 grid gap-2">
              {group.dossiers.slice(0, 3).map((dossier) => (
                <Link key={dossier.id} href={`/comun/dossies/${dossier.public_slug}`} className="border border-comun-yellow p-3 text-sm font-bold text-comun-paper">
                  {dossier.public_title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DossierCard({ dossier, filters }: { dossier: PublishedPautaDossierSnapshot; filters: ReturnType<typeof normalizeFilters> }) {
  const updatedAt = dossier.public_updated_at ?? dossier.published_at;
  return (
    <Link
      href={`/comun/dossies/${dossier.public_slug}`}
      className="paper-panel flex min-h-[17rem] flex-col border-2 border-comun-black p-5"
    >
      <StatusLabel value="published" />
      <h2 className="comun-prose mt-3 text-xl font-black uppercase">{dossier.public_title}</h2>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.public_summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/65">
        {dossier.pauta ? <FilterLink label="Pauta" value={dossier.pauta.title} param="pauta" filters={filters} /> : null}
        {dossier.pauta?.community ? <FilterLink label="Comunidade" value={dossier.pauta.community} param="comunidade" filters={filters} /> : null}
        {dossier.pauta?.category ? <FilterLink label="Categoria" value={dossier.pauta.category} param="categoria" filters={filters} /> : null}
        <span>Publicado: {new Date(dossier.published_at).toLocaleDateString("pt-BR")}</span>
        <span>Atualizado: {new Date(updatedAt).toLocaleDateString("pt-BR")}</span>
        {dossier.public_version_label ? <span>{dossier.public_version_label}</span> : null}
      </div>
      <span className="mt-auto pt-5 text-sm font-black uppercase text-comun-rust">Ler dossie</span>
    </Link>
  );
}

function FilterLink({ label, value, param, filters }: { label: string; value: string; param: "pauta" | "comunidade" | "categoria"; filters: ReturnType<typeof normalizeFilters> }) {
  return (
    <span>
      {label}:{" "}
      <Link href={`/comun/dossies?${filterHref(param, value, filters)}`} className="underline decoration-comun-rust decoration-2 underline-offset-2">
        {value}
      </Link>
    </span>
  );
}

function filterHref(param: "pauta" | "comunidade" | "categoria", value: string, filters: ReturnType<typeof normalizeFilters>) {
  const params = new URLSearchParams();
  if (filters.busca) params.set("busca", filters.busca);
  if (filters.ordem && filters.ordem !== "recentes") params.set("ordem", filters.ordem);
  params.set(param, value);
  return params.toString();
}

function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase">
      {label}
      <select name={name} defaultValue={value} className="min-h-11 border-2 border-comun-yellow bg-comun-paper px-2 text-comun-black">
        <option value="">Todos</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function normalizeFilters(searchParams: DossierIndexSearchParams) {
  const ordem = searchParams.ordem === "atualizados" ? "atualizados" : "recentes";
  const filters = {
    pauta: normalizeFilterValue(searchParams.pauta),
    comunidade: normalizeFilterValue(searchParams.comunidade),
    categoria: normalizeFilterValue(searchParams.categoria),
    busca: normalizeFilterValue(searchParams.busca),
    ordem,
  };
  return { ...filters, hasAny: Boolean(filters.pauta || filters.comunidade || filters.categoria || filters.busca) };
}

function normalizeFilterValue(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function filterDossiers(dossiers: PublishedPautaDossierSnapshot[], filters: ReturnType<typeof normalizeFilters>) {
  const query = normalizeSearch(filters.busca);
  return dossiers.filter((dossier) => {
    if (filters.pauta && dossier.pauta?.title !== filters.pauta) return false;
    if (filters.comunidade && dossier.pauta?.community !== filters.comunidade) return false;
    if (filters.categoria && dossier.pauta?.category !== filters.categoria) return false;
    if (query) {
      const haystack = normalizeSearch([
        dossier.public_title,
        dossier.public_summary,
        dossier.public_body,
        dossier.pauta?.title,
      ].filter(Boolean).join(" "));
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function sortDossiers(dossiers: PublishedPautaDossierSnapshot[], ordem: string) {
  return [...dossiers].sort((a, b) => {
    const aDate = new Date(ordem === "atualizados" ? a.public_updated_at ?? a.published_at : a.published_at).getTime();
    const bDate = new Date(ordem === "atualizados" ? b.public_updated_at ?? b.published_at : b.published_at).getTime();
    return bDate - aDate;
  });
}

function buildFilterOptions(dossiers: PublishedPautaDossierSnapshot[]) {
  return {
    pautas: uniqueSorted(dossiers.map((dossier) => dossier.pauta?.title)),
    comunidades: uniqueSorted(dossiers.map((dossier) => dossier.pauta?.community)),
    categorias: uniqueSorted(dossiers.map((dossier) => dossier.pauta?.category)),
  };
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
