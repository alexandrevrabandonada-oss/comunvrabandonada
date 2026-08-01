import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { slug } = await params;
  const database = createServiceSupabaseClient();
  if (!database) notFound();
  const { data: program } = await database
    .from("comun_radio_programs")
    .select(
      "archive_item_id,title_public,subtitle_public,description_public,format_type,frequency_public,territory:comun_hub_territories(slug,name,visibility),pauta:comun_pauta_spaces(slug,title,visibility,status)",
    )
    .eq("slug_public", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (!program) notFound();
  const { data: episodes } = await database
    .from("comun_radio_episodes")
    .select(
      "archive_item_id,title_public,slug_public,summary_public,published_at,duration_seconds",
    )
    .eq("program_item_id", program.archive_item_id)
    .eq("publication_status", "published")
    .order("published_at", { ascending: false })
    .limit(50);
  const appV2 = isComunAppV2((await searchParams).experiencia);

  if (appV2) {
    const territory = unwrap(program.territory);
    const pauta = unwrap(program.pauta);
    const relations: EntityRelation[] = [
      ...(territory?.visibility === "public"
        ? [
            {
              ...entityReference("territory", territory.slug, territory.name),
              source: "foreign_key" as const,
            },
          ]
        : []),
      ...(pauta?.visibility === "public" && pauta.status !== "archived"
        ? [
            {
              ...entityReference("pauta", pauta.slug, pauta.title),
              source: "foreign_key" as const,
            },
          ]
        : []),
      {
        kind: "memory",
        slug: "radio",
        title: "Rádio COMUN",
        href: "/comun/radio",
        source: "canonical_route",
      },
    ];
    const context = createComunEntityContext({
      kind: "memory",
      id: program.archive_item_id,
      slug,
      title: program.title_public,
      state: "Programa publicado",
      summary: program.description_public,
      primaryAction: episodes?.length
        ? {
            href: `/comun/radio/programas/${slug}#episodios`,
            label: "Ouvir episódios",
            description: "Escolha um episódio publicado deste programa.",
          }
        : undefined,
      territory:
        territory?.visibility === "public"
          ? entityReference("territory", territory.slug, territory.name)
          : undefined,
      pauta:
        pauta?.visibility === "public" && pauta.status !== "archived"
          ? entityReference("pauta", pauta.slug, pauta.title)
          : undefined,
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: program.title_public,
          contextLabel: "Rádio · programa",
          backDestination: "/comun/radio",
        }}
      >
        <main
          className="comun-v2-page"
          data-comun-app-v2-page="radio-program-detail"
        >
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <p className="mt-5 text-sm text-comun-paper/72">
            {program.format_type}
            {program.frequency_public ? ` · ${program.frequency_public}` : ""}
          </p>
          <ComunRelatedSection id="episodios" title="Episódios publicados">
            {episodes?.length ? (
              <div className="grid gap-4">
                {episodes.map((episode) => (
                  <Link
                    className="surface-memory rounded-[var(--comun-radius-cultural)] p-5 text-comun-black"
                    href={withComunAppV2(
                      `/comun/radio/episodios/${episode.slug_public}`,
                    )}
                    key={episode.archive_item_id}
                  >
                    <b>{episode.title_public}</b>
                    <p className="mt-2 text-sm text-comun-black/72">
                      {episode.summary_public}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <ComunEmptyStateV2
                title="Nenhum episódio publicado ainda"
                explanation="O programa existe, mas ainda não possui episódio com revisão, direitos e publicação concluídos."
                action={{ href: "/comun/radio", label: "Explorar a Rádio" }}
                secondaryActions={[
                  {
                    href: "/comun/radio/contribuir",
                    label: "Contribuir com a Rádio",
                  },
                ]}
              />
            )}
          </ComunRelatedSection>
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          {program.format_type}
        </p>
        <h1 className="text-4xl font-black uppercase text-comun-paper">
          {program.title_public}
        </h1>
        <p className="mt-4 max-w-3xl text-comun-paper/80">
          {program.description_public}
        </p>
        <div className="mt-8 grid gap-4">
          {episodes?.map((episode) => (
            <Link
              className="paper-panel border-2 p-5"
              href={`/comun/radio/episodios/${episode.slug_public}`}
              key={episode.archive_item_id}
            >
              <b>{episode.title_public}</b>
              <p>{episode.summary_public}</p>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
