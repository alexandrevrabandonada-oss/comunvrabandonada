import Link from "next/link";
import { ComunCommunityCard } from "@/components/comun-cards";
import { ComunShell, Section } from "@/components/comun-shell";
import { listCommunities } from "@/lib/comun-data";
import {
  filterCommunityExperiences,
  listCommunityExperiences,
} from "@/lib/community-experience";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";
type Params = {
  q?: string;
  tipo?: string;
  tema?: string;
  acao?: string;
  experiencia?: string;
};

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const [communities, experiences] = await Promise.all([
    listCommunities(),
    Promise.resolve(listCommunityExperiences()),
  ]);
  const filtered = filterCommunityExperiences(
    experiences,
    params.q ?? "",
    params.tipo ?? "",
    params.tema ?? "",
    params.acao === "aberta",
  );
  const bySlug = new Map(
    communities.map((community) => [community.slug, community]),
  );
  if (isComunAppV2(params.experiencia))
    return (
      <ComunShell>
        <div className="comun-v2-page" data-comun-app-v2-page="communities">
          <header>
            <p className="comun-v2-eyebrow text-comun-rust">
              Descobrir sem cadastro
            </p>
            <h1 className="comun-v2-title mt-2 normal-case">Comunidades</h1>
            <p className="mt-3 max-w-2xl text-comun-black/65">
              Casas organizativas por território, tema e ação que precisa
              acontecer.
            </p>
          </header>
          <CommunityFilters params={params} count={filtered.length} />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {filtered.map((experience) => {
              const community = bySlug.get(experience.slug);
              if (!community) return null;
              return (
                <ComunCommunityCard
                  key={community.slug}
                  href={withComunAppV2(`/comun/c/${community.slug}`)}
                  name={community.name}
                  purpose={experience.purpose}
                  territory={experience.territory}
                  themes={experience.themes}
                  relationship={
                    experience.state === "monitoring"
                      ? "Você acompanha"
                      : experience.state === "organizing"
                        ? "Em organização"
                        : "Em escuta"
                  }
                  nextAction={experience.nextAction}
                  activity={
                    experience.nextActivity
                      ? `${experience.nextActivity.title} · ${experience.nextActivity.dateLabel}`
                      : null
                  }
                  emblem={community.icon}
                />
              );
            })}
          </div>
          {!filtered.length ? <EmptyFiltered appV2 /> : null}
        </div>
      </ComunShell>
    );

  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          Comunidades vivas · descobrir sem cadastro
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow sm:text-6xl">
          Comunidades
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Comunidades são casas organizativas persistentes. Encontre uma pelo
          território, tema ou ação que precisa acontecer agora.
        </p>
        <LegacyFilters params={params} />
        <p role="status" className="mt-4 text-sm">
          {filtered.length} comunidades encontradas. A ordem é editorial, sem
          ranking ou popularidade.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((experience) => {
            const community = bySlug.get(experience.slug);
            if (!community) return null;
            return (
              <Link
                key={community.slug}
                href={`/comun/c/${community.slug}`}
                className="paper-panel flex min-h-[18rem] flex-col border-2 border-comun-black border-t-8 border-t-comun-yellow p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center bg-comun-black text-sm font-black text-comun-yellow">
                    {community.icon}
                  </span>
                  <span className="border-2 border-comun-black px-2 py-1 text-xs font-black uppercase">
                    {experience.kind === "territorial"
                      ? "Territorial"
                      : "Temática"}{" "}
                    · {experience.state}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black">{community.name}</h2>
                <p className="mt-2 text-sm text-comun-asphalt/75">
                  {experience.purpose}
                </p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div>
                    <dt className="font-black uppercase">Território ou tema</dt>
                    <dd>
                      {experience.territory} · {experience.themes.join(" · ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-black uppercase">Próxima ação</dt>
                    <dd>{experience.nextAction}</dd>
                  </div>
                  {experience.nextActivity ? (
                    <div>
                      <dt className="font-black uppercase">
                        Atividade próxima
                      </dt>
                      <dd>
                        {experience.nextActivity.title} ·{" "}
                        {experience.nextActivity.dateLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <span className="mt-auto pt-5 font-black text-comun-rust">
                  Conhecer comunidade →
                </span>
              </Link>
            );
          })}
        </div>
        {!filtered.length ? <EmptyFiltered /> : null}
      </Section>
    </ComunShell>
  );
}

function CommunityFilters({
  params,
  count,
}: {
  params: Params;
  count: number;
}) {
  const active = [
    params.tipo,
    params.tema,
    params.acao === "aberta" ? "ação aberta" : "",
  ].filter(Boolean);
  return (
    <form className="mt-6" aria-label="Filtros de comunidades">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="community-v2-q">
          Buscar comunidade
        </label>
        <input
          id="community-v2-q"
          name="q"
          defaultValue={params.q}
          placeholder="Nome, propósito ou território"
          className="min-h-12 rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-comun-black px-4 text-comun-paper placeholder:text-comun-paper/55"
        />
        <input type="hidden" name="experiencia" value="app-v2" />
        <button className="comun-v2-action">Buscar</button>
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterLink
          href="/comun/comunidades"
          label="Todas"
          active={!params.tipo && !params.tema && params.acao !== "aberta"}
        />
        <FilterLink
          href="/comun/comunidades?tipo=territorial"
          label="Territoriais"
          active={params.tipo === "territorial"}
        />
        <FilterLink
          href="/comun/comunidades?tipo=thematic"
          label="Temáticas"
          active={params.tipo === "thematic"}
        />
        <FilterLink
          href="/comun/comunidades?acao=aberta"
          label="Ação aberta"
          active={params.acao === "aberta"}
        />
      </div>
      <details className="mt-2 rounded-[var(--comun-radius-control)] border border-comun-black/20 p-3">
        <summary className="min-h-11 cursor-pointer font-black">
          Filtros avançados
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-black">
            Tipo
            <select
              name="tipo"
              defaultValue={params.tipo ?? ""}
              className="min-h-12 border-2 border-comun-black bg-comun-paper px-3 font-normal"
            >
              <option value="">Todos</option>
              <option value="territorial">Territorial</option>
              <option value="thematic">Temática</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black">
            Tema
            <select
              name="tema"
              defaultValue={params.tema ?? ""}
              className="min-h-12 border-2 border-comun-black bg-comun-paper px-3 font-normal"
            >
              <option value="">Todos</option>
              <option value="trabalho">Trabalho</option>
              <option value="educação">Educação</option>
              <option value="saúde">Saúde</option>
              <option value="meio ambiente">Meio ambiente</option>
              <option value="mobilidade">Mobilidade</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="acao"
              value="aberta"
              defaultChecked={params.acao === "aberta"}
            />{" "}
            Somente comunidades com ação aberta
          </label>
          <button className="comun-v2-action sm:col-span-2">
            Aplicar filtros
          </button>
        </div>
      </details>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm font-bold">
          {count} comunidades encontradas · ordem editorial
        </p>
        {active.length ? (
          <Link
            href={withComunAppV2("/comun/comunidades")}
            className="inline-flex min-h-11 items-center font-black underline"
          >
            Limpar {active.length} filtro(s)
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={withComunAppV2(href)}
      className="comun-v2-chip"
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function LegacyFilters({ params }: { params: Params }) {
  return (
    <form className="mt-6 grid gap-3 border-y-2 border-comun-paper/25 py-5 md:grid-cols-[2fr_1fr_1fr_auto]">
      <label className="grid gap-1 text-xs font-black uppercase">
        Buscar comunidade
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Nome, propósito ou território"
          className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"
        />
      </label>
      <label className="grid gap-1 text-xs font-black uppercase">
        Tipo
        <select
          name="tipo"
          defaultValue={params.tipo ?? ""}
          className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"
        >
          <option value="">Todos</option>
          <option value="territorial">Territorial</option>
          <option value="thematic">Temática</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-black uppercase">
        Tema
        <select
          name="tema"
          defaultValue={params.tema ?? ""}
          className="min-h-12 border-2 bg-white px-3 text-base font-normal normal-case text-comun-black"
        >
          <option value="">Todos</option>
          <option value="trabalho">Trabalho</option>
          <option value="educação">Educação</option>
          <option value="saúde">Saúde</option>
          <option value="meio ambiente">Meio ambiente</option>
          <option value="mobilidade">Mobilidade</option>
        </select>
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <button className="min-h-12 bg-comun-yellow px-4 font-black uppercase text-comun-black">
          Filtrar
        </button>
        <Link
          href="/comun/comunidades"
          className="inline-flex min-h-12 items-center px-2 font-black underline"
        >
          Limpar
        </Link>
      </div>
      <label className="flex min-h-11 items-center gap-2 md:col-span-4">
        <input
          type="checkbox"
          name="acao"
          value="aberta"
          defaultChecked={params.acao === "aberta"}
        />{" "}
        Somente comunidades com ação aberta
      </label>
    </form>
  );
}

function EmptyFiltered({ appV2 = false }: { appV2?: boolean }) {
  return (
    <div
      className={`mt-6 p-5 ${appV2 ? "surface-alert rounded-[var(--comun-radius-card)]" : "border-2 border-comun-yellow"}`}
    >
      <h2
        className={`font-black ${appV2 ? "" : "uppercase text-comun-yellow"}`}
      >
        Nenhuma comunidade com esses filtros
      </h2>
      <p className="mt-2">
        Limpe um filtro, explore pautas ou conheça formas de participação.
      </p>
      <div className="mt-4 flex gap-4">
        <Link
          href={withComunAppV2("/comun/comunidades", appV2)}
          className="font-black underline"
        >
          Limpar filtros
        </Link>
        <Link
          href={withComunAppV2("/comun/participar", appV2)}
          className="font-black underline"
        >
          Como participar
        </Link>
      </div>
    </div>
  );
}
