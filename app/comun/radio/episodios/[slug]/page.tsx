import { ComunRadioPublicRights } from "@/components/comun-radio-public-rights";
import { DiscoveryReturn } from "@/components/comun-public-discovery";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { RadioPlayer } from "@/components/radio-player";
import { ComunContextTrail } from "@/components/comun-context-trail";
import {
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { getPublicEpisode } from "@/lib/radio";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export default async function EpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    experiencia?: string;
    origem?: string;
    categoria?: string;
  }>;
}) {
  const { slug } = await params;
  const episode: any = await getPublicEpisode(slug);
  if (!episode) notFound();
  const audio = episode.comun_archive_assets?.find(
    (asset: any) =>
      asset.asset_role === "radio_public_episode" &&
      asset.review_status === "approved" &&
      asset.public_url,
  );
  const discoveryQuery = await searchParams;
  const appV2 = isComunAppV2(discoveryQuery.experiencia);
  if (appV2) {
    const relations: EntityRelation[] = [
      ...(episode.territory
        ? [
            {
              ...entityReference(
                "territory",
                episode.territory.slug,
                episode.territory.name,
              ),
              source: "foreign_key" as const,
            },
          ]
        : []),
      ...(episode.pauta
        ? [
            {
              ...entityReference(
                "pauta",
                episode.pauta.slug,
                episode.pauta.title,
              ),
              source: "foreign_key" as const,
            },
          ]
        : []),
      ...(episode.action
        ? [
            {
              ...entityReference(
                "action",
                episode.action.slug,
                episode.action.title,
              ),
              source: "foreign_key" as const,
            },
          ]
        : []),
    ];
    const context = createComunEntityContext({
      kind: "memory",
      id: episode.archive_item_id,
      slug: episode.slug_public,
      title: episode.title_public,
      state: `Transcrição ${episode.transcript_status}`,
      summary: episode.summary_public,
      territory: episode.territory
        ? entityReference(
            "territory",
            episode.territory.slug,
            episode.territory.name,
          )
        : undefined,
      pauta: episode.pauta
        ? entityReference("pauta", episode.pauta.slug, episode.pauta.title)
        : undefined,
      primaryAction: {
        href: "/comun/radio",
        label: "Voltar à Rádio",
        description: "Continue ouvindo programas e episódios publicados.",
      },
      relations,
    });
    return (
      <ComunShell
        publicReadOnlyFallback
        appBar={{
          title: episode.title_public,
          contextLabel: `Rádio · ${episode.comun_radio_programs?.title_public ?? "episódio"}`,
          backDestination: "/comun/radio",
        }}
      >
        <div
          className="comun-v2-page comun-v2-page--reading comun-relational-page"
          data-comun-app-v2-page="radio-episode"
        >
          <DiscoveryReturn query={discoveryQuery} />
          <ComunContextTrail
            items={[
              {
                kind: "entidade",
                label: "Rádio",
                href: withComunAppV2("/comun/radio"),
              },
              ...(episode.pauta
                ? [
                    {
                      kind: "pauta" as const,
                      label: episode.pauta.title,
                      href: withComunAppV2(
                        `/comun/pautas/${episode.pauta.slug}`,
                      ),
                    },
                  ]
                : []),
              { kind: "entidade", label: episode.title_public },
            ]}
          />
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <ComunRelatedSection title="Ouvir episódio">
            {audio ? (
              <RadioPlayer
                src={audio.public_url}
                title={episode.title_public}
                chapters={episode.comun_radio_episode_chapters || []}
                allowDownload={episode.allow_download}
              />
            ) : (
              <p
                role="status"
                className="surface-alert rounded-[var(--comun-radius-card)] p-4 text-comun-black"
              >
                Áudio público indisponível. Volte à Rádio para escolher outro
                episódio.
              </p>
            )}
          </ComunRelatedSection>
          <ComunRelatedSection title="Créditos e direitos">
            <ComunRadioPublicRights
              credits={episode.comun_radio_credits}
              music={episode.comun_radio_music_uses}
            />
          </ComunRelatedSection>
          {episode.transcript?.content ? (
            <ComunRelatedSection title="Transcrição revisada">
              <pre className="whitespace-pre-wrap font-sans text-comun-paper/80">
                {episode.transcript.content}
              </pre>
            </ComunRelatedSection>
          ) : (
            <p className="mt-7 text-comun-paper/65">
              Transcrição: {episode.transcript_status}.
            </p>
          )}
          <Link
            href={withComunAppV2("/comun/radio/direitos-e-consentimento")}
            className="mt-8 inline-flex min-h-11 items-center font-black text-comun-yellow underline"
          >
            Correção, consentimento e retirada
          </Link>
        </div>
      </ComunShell>
    );
  }
  return (
    <ComunShell publicReadOnlyFallback>
      <Section>
        <DiscoveryReturn query={discoveryQuery} />
        <p className="text-xs font-black uppercase text-comun-yellow">
          {episode.comun_radio_programs?.title_public}
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper">
          {episode.title_public}
        </h1>
        <p className="mt-4 max-w-3xl text-comun-paper/80">
          {episode.summary_public}
        </p>
        {audio ? (
          <div className="mt-7">
            <RadioPlayer
              src={audio.public_url}
              title={episode.title_public}
              chapters={episode.comun_radio_episode_chapters || []}
              allowDownload={episode.allow_download}
            />
          </div>
        ) : (
          <p className="mt-7 border-2 p-4">Áudio público indisponível.</p>
        )}
        <section aria-labelledby="episode-rights-heading" className="mt-7">
          <h2 id="episode-rights-heading" className="mb-3 text-2xl font-black">
            Créditos e direitos
          </h2>
          <ComunRadioPublicRights
            credits={episode.comun_radio_credits}
            music={episode.comun_radio_music_uses}
          />
        </section>
        <Link
          href="/comun/radio/direitos-e-consentimento"
          className="mt-8 inline-block underline"
        >
          Correção, consentimento e retirada
        </Link>
      </Section>
    </ComunShell>
  );
}
