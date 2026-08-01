import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunContextTrail } from "@/components/comun-context-trail";
import {
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ArtworkImage, ArtworkRightsBadge } from "@/components/territorial-art";
import {
  createComunEntityContext,
  entityReference,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { getPublicArtwork } from "@/lib/archive/territorial-art";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export default async function ArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { slug } = await params;
  const item: any = await getPublicArtwork(slug);
  if (!item) notFound();
  const art = Array.isArray(item.comun_archive_artworks)
    ? item.comun_archive_artworks[0]
    : item.comun_archive_artworks;
  const territory = Array.isArray(art?.territory)
    ? art.territory[0]
    : art?.territory;
  const assets = (item.comun_archive_assets || []).filter(
    (asset: any) =>
      asset.public_url && asset.asset_role !== "artwork_public_social_preview",
  );
  const credits = (item.comun_archive_artwork_credits || []).sort(
    (a: any, b: any) => a.position - b.position,
  );
  const rights = Array.isArray(item.comun_archive_artwork_rights)
    ? item.comun_archive_artwork_rights[0]
    : item.comun_archive_artwork_rights;
  const appV2 = isComunAppV2((await searchParams).experiencia);
  if (appV2) {
    const relations: EntityRelation[] =
      territory?.visibility === "public"
        ? [
            {
              ...entityReference("territory", territory.slug, territory.name),
              source: "foreign_key" as const,
            },
          ]
        : [];
    const context = createComunEntityContext({
      kind: "memory",
      id: item.id,
      slug: item.slug,
      title: item.title,
      state: "Obra publicada",
      summary:
        art.description_public ?? item.summary ?? "Obra do Acervo territorial.",
      territory:
        territory?.visibility === "public"
          ? entityReference("territory", territory.slug, territory.name)
          : undefined,
      primaryAction: {
        href: "/comun/acervo/arte",
        label: "Voltar à Arte",
        description:
          "Continue explorando obras publicadas com autoria e direitos.",
      },
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: item.title,
          contextLabel: `Arte · ${territory?.name ?? "contexto editorial"}`,
          backDestination: "/comun/acervo/arte",
        }}
      >
        <main
          className="comun-v2-page comun-v2-page--reading comun-relational-page"
          data-comun-app-v2-page="artwork-detail"
        >
          <ComunContextTrail
            items={[
              {
                kind: "entidade",
                label: "Arte",
                href: withComunAppV2("/comun/acervo/arte"),
              },
              ...(territory?.visibility === "public"
                ? [
                    {
                      kind: "território" as const,
                      label: territory.name,
                      href: withComunAppV2(
                        `/comun/territorios/${territory.slug}`,
                      ),
                    },
                  ]
                : []),
              { kind: "entidade", label: item.title },
            ]}
          />
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <article className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
            <div>
              <ArtworkImage
                asset={
                  assets.find(
                    (asset: any) =>
                      asset.asset_role === "artwork_public_detail",
                  ) || assets[0]
                }
                title={item.title}
                priority
              />
              <p className="mt-2 text-sm text-comun-paper/65">
                {assets[0]?.credits ||
                  credits
                    .map((credit: any) => credit.public_credit)
                    .join(" · ")}
              </p>
            </div>
            <dl className="surface-memory grid content-start gap-4 rounded-[var(--comun-radius-cultural)] p-5 text-comun-black">
              <V2Row
                label="Linguagem"
                value={art.artwork_type?.replaceAll("_", " ")}
              />
              <V2Row
                label="Autoria"
                value={credits
                  .map((credit: any) => credit.public_credit)
                  .join(" · ")}
              />
              <V2Row
                label="Período"
                value={
                  art.creation_period_public ||
                  art.creation_year ||
                  item.approximate_date
                }
              />
              <V2Row label="Técnica" value={art.technique_public} />
              <V2Row
                label="Território"
                value={
                  territory?.visibility === "public"
                    ? territory.name
                    : art.creation_place_public || item.neighborhood
                }
              />
              <ArtworkRightsBadge rights={rights} />
            </dl>
          </article>
          <ComunRelatedSection title="Contexto">
            <p className="text-comun-paper/80">
              {art.context_public ?? art.description_public}
            </p>
          </ComunRelatedSection>
          <ComunRelatedSection
            title="Relações publicadas"
            summary="Relações políticas ou comunitárias não são inferidas a partir da descrição da obra."
          >
            {relations.length ? (
              <ComunRelationRail relations={relations} title="Ligada a" />
            ) : (
              <p className="text-comun-paper/68">
                Nenhuma relação cívica pública foi cadastrada para esta obra.
              </p>
            )}
          </ComunRelatedSection>
          <Link
            href={withComunAppV2(
              `/comun/acervo/arte/direitos-e-retirada?obra=${item.slug}`,
            )}
            className="mt-7 inline-flex min-h-11 items-center font-black text-comun-yellow underline"
          >
            Corrigir crédito ou solicitar retirada
          </Link>
        </main>
      </ComunShell>
    );
  }
  return (
    <ComunShell>
      <Section>
        <Link
          href="/comun/acervo/arte"
          className="font-bold text-comun-yellow underline"
        >
          ← Arte dos territórios
        </Link>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.7fr)]">
          <div>
            <ArtworkImage
              asset={
                assets.find(
                  (asset: any) => asset.asset_role === "artwork_public_detail",
                ) || assets[0]
              }
              title={item.title}
              priority
            />
            <p className="mt-2 text-sm">
              {assets[0]?.credits ||
                credits.map((credit: any) => credit.public_credit).join(" · ")}
            </p>
          </div>
          <article className="bg-comun-paper p-6 text-comun-black">
            <p className="text-xs font-black uppercase">
              {art.artwork_type.replaceAll("_", " ")}
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none">
              {item.title}
            </h1>
            <p className="mt-6 leading-relaxed">{art.description_public}</p>
            <h2 className="mt-7 text-xl font-black uppercase">Contexto</h2>
            <p className="mt-2 leading-relaxed">{art.context_public}</p>
            <div className="mt-7">
              <ArtworkRightsBadge rights={rights} />
            </div>
            <Link
              href={`/comun/acervo/arte/direitos-e-retirada?obra=${item.slug}`}
              className="mt-5 inline-block font-bold underline"
            >
              Corrigir crédito ou solicitar retirada
            </Link>
          </article>
        </div>
      </Section>
    </ComunShell>
  );
}

function V2Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return value ? (
    <div>
      <dt className="comun-v2-eyebrow text-comun-black/55">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  ) : null;
}
