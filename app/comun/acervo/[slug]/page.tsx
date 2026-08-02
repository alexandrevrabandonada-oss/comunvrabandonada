import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { archiveDate, getPublicArchiveItem } from "@/lib/archive";
import { MemorySuggestionForm } from "./memory-suggestion-form";
import { getPublicArchiveEntityRelations } from "@/lib/central-hub";
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
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
export const dynamic = "force-dynamic";
export default async function ArchiveItemPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const params = await props.params;
  const appV2 = isComunAppV2((await props.searchParams).experiencia);
  const item = await getPublicArchiveItem(params.slug);
  if (!item) notFound();
  if (item.item_type === "territorial_artwork")
    permanentRedirect(withComunAppV2(`/comun/acervo/arte/${item.slug}`, appV2));
  const asset = item.assets.find((a) => a.public_url);
  if (appV2) {
    const links = await getPublicArchiveEntityRelations(item.id);
    const relations: EntityRelation[] = links.flatMap((link: any) => [
      ...(link.territory
        ? [
            {
              ...entityReference(
                "territory",
                link.territory.slug,
                link.territory.name,
              ),
              source: "junction" as const,
            },
          ]
        : []),
      ...(link.pauta
        ? [
            {
              ...entityReference("pauta", link.pauta.slug, link.pauta.title),
              source: "junction" as const,
            },
          ]
        : []),
      ...(link.action
        ? [
            {
              ...entityReference("action", link.action.slug, link.action.title),
              source: "junction" as const,
            },
          ]
        : []),
      ...(link.result
        ? [
            {
              ...entityReference("result", link.result.slug, link.result.title),
              source: "junction" as const,
            },
          ]
        : []),
    ]);
    const context = createComunEntityContext({
      kind: "memory",
      id: item.id,
      slug: item.slug,
      title: item.title,
      state: "Publicado",
      summary: item.summary ?? "Item do Acervo público.",
      primaryAction: {
        href: "/comun/acervo",
        label: "Voltar ao Acervo",
        description: "Continue explorando a memória coletiva revisada.",
      },
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: item.title,
          contextLabel: `Acervo · ${item.item_type}`,
          backDestination: "/comun/acervo",
        }}
      >
        <main
          className="comun-v2-page comun-v2-page--reading comun-relational-page"
          data-comun-app-v2-page="archive-item"
        >
          <ComunContextTrail
            items={[
              {
                kind: "entidade",
                label: "Acervo",
                href: withComunAppV2("/comun/acervo"),
              },
              { kind: "entidade", label: item.title },
            ]}
          />
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <article className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              {asset?.public_url && asset.mime_type?.startsWith("image/") ? (
                <Image
                  src={asset.public_url}
                  alt={asset.alt_text ?? ""}
                  width={1200}
                  height={900}
                  className="h-auto w-full rounded-[var(--comun-radius-cultural)] object-contain"
                />
              ) : asset?.public_url ? (
                <a href={asset.public_url} className="comun-v2-action">
                  Abrir documento público
                </a>
              ) : null}
            </div>
            <dl className="surface-memory grid gap-3 rounded-[var(--comun-radius-cultural)] p-5 text-sm text-comun-black">
              <V2Row label="Data ou período" value={archiveDate(item)} />
              <V2Row
                label="Local publicado"
                value={[item.place_name, item.neighborhood, item.city]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <V2Row label="Fonte" value={item.source_name} />
              <V2Row label="Créditos" value={item.credits} />
              <V2Row
                label="Direitos"
                value={item.license_text || item.rights_status}
              />
            </dl>
          </article>
          {item.description ? (
            <ComunRelatedSection title="Contexto">
              <p className="whitespace-pre-wrap text-comun-paper/80">
                {item.description}
              </p>
            </ComunRelatedSection>
          ) : null}
          <ComunRelatedSection
            title="Relações publicadas"
            summary="Somente vínculos explícitos na tabela canônica de memória são exibidos."
          >
            {relations.length ? (
              <ComunRelationRail relations={relations} title="Ligado a" />
            ) : (
              <p className="text-comun-paper/68">
                Este item não possui relação cívica pública explícita. Nenhum
                vínculo foi inferido pelo texto.
              </p>
            )}
          </ComunRelatedSection>
          <Link
            href={withComunAppV2(
              `/comun/acervo/direitos-e-remocao?item=${encodeURIComponent(item.slug)}`,
            )}
            className="mt-7 inline-flex min-h-11 items-center font-black text-comun-yellow underline"
          >
            Corrigir ou solicitar retirada
          </Link>
        </main>
      </ComunShell>
    );
  }
  return (
    <ComunShell>
      <Section>
        <Link
          href="/comun/acervo"
          className="font-black uppercase text-comun-yellow"
        >
          ← Acervo
        </Link>
        <article className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            {asset?.public_url && asset.mime_type?.startsWith("image/") ? (
              <Image
                src={asset.public_url}
                alt={asset.alt_text ?? ""}
                width={1200}
                height={900}
                className="h-auto w-full border-2 border-comun-yellow object-contain"
              />
            ) : asset?.public_url ? (
              <a
                href={asset.public_url}
                className="inline-flex min-h-12 items-center border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow"
              >
                Abrir documento público
              </a>
            ) : null}
          </div>
          <div>
            <p className="font-black uppercase text-comun-yellow">
              {item.item_type}
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase">{item.title}</h1>
            {item.summary ? (
              <p className="mt-4 text-lg text-comun-paper/80">{item.summary}</p>
            ) : null}
            <dl className="mt-5 grid gap-3 border-y-2 border-comun-yellow py-4 text-sm">
              <Row label="Data/período" value={archiveDate(item)} />
              <Row
                label="Local"
                value={[item.place_name, item.neighborhood, item.city]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Row label="Fonte" value={item.source_name} />
              <Row label="Créditos" value={item.credits} />
              <Row
                label="Direitos"
                value={item.license_text || item.rights_status}
              />
              {item.genre ? <Row label="Gênero" value={item.genre} /> : null}
              {item.members ? (
                <Row label="Integrantes" value={item.members} />
              ) : null}
            </dl>
          </div>
        </article>
        {item.description ? (
          <div className="comun-prose mt-8 whitespace-pre-wrap text-comun-paper/85">
            {item.description}
          </div>
        ) : null}
        {item.source_description ? (
          <section className="mt-7 border-2 border-comun-yellow p-4">
            <h2 className="font-black uppercase text-comun-yellow">
              Sobre a fonte
            </h2>
            <p className="mt-2 text-sm text-comun-paper/75">
              {item.source_description}
            </p>
          </section>
        ) : null}
        {item.official_links?.length ? (
          <section className="mt-7">
            <h2 className="text-xl font-black uppercase text-comun-yellow">
              Links oficiais
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {item.official_links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                  className="border-2 border-comun-yellow px-3 py-2 font-black uppercase text-comun-yellow"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {item.item_type === "photograph" ? (
          <>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-black uppercase text-comun-yellow">
              {item.neighborhood ? (
                <Link
                  href={`/comun/acervo?type=photograph&neighborhood=${encodeURIComponent(item.neighborhood)}`}
                >
                  Ver mais deste bairro
                </Link>
              ) : null}
              {item.year_start ? (
                <Link
                  href={`/comun/acervo?type=photograph&decade=${Math.floor(item.year_start / 10) * 10}`}
                >
                  Ver mais desta decada
                </Link>
              ) : null}
              {item.place_name ? (
                <Link
                  href={`/comun/acervo?type=photograph&place=${encodeURIComponent(item.place_name)}`}
                >
                  Ver mais deste lugar
                </Link>
              ) : null}
            </div>
            <MemorySuggestionForm itemId={item.id} />
          </>
        ) : null}
      </Section>
    </ComunShell>
  );
}

function V2Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return value ? (
    <div>
      <dt className="comun-v2-eyebrow text-comun-black/75">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  ) : null;
}
function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return value ? (
    <div>
      <dt className="font-black uppercase text-comun-yellow">{label}</dt>
      <dd className="mt-1 text-comun-paper/80">{value}</dd>
    </div>
  ) : null;
}
