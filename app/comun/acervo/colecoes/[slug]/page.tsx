import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunMemoryCard } from "@/components/comun-cards";
import { ComunContextTrail } from "@/components/comun-context-trail";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
} from "@/components/comun-relational";
import { archiveDate, getPublicCollection } from "@/lib/archive";
import { createComunEntityContext } from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
export const dynamic = "force-dynamic";
export default async function Collection({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const data = await getPublicCollection((await params).slug);
  if (!data) notFound();
  const appV2 = isComunAppV2((await searchParams).experiencia);
  if (appV2) {
    const context = createComunEntityContext({
      kind: "memory",
      id: data.collection.id,
      slug: data.collection.slug,
      title: data.collection.title,
      state: "Coleção publicada",
      summary:
        data.collection.description ||
        data.collection.summary ||
        "Coleção editorial do Acervo.",
      primaryAction: {
        href: "/comun/acervo/colecoes",
        label: "Ver todas as coleções",
      },
      relations: [],
    });
    return (
      <ComunShell
        appBar={{
          title: data.collection.title,
          contextLabel: "Acervo · coleção",
          backDestination: "/comun/acervo/colecoes",
        }}
      >
        <main
          className="comun-v2-page comun-v2-page--reading comun-relational-page"
          data-comun-app-v2-page="archive-collection"
        >
          <ComunContextTrail
            items={[
              {
                kind: "entidade",
                label: "Coleções",
                href: withComunAppV2("/comun/acervo/colecoes"),
              },
              { kind: "entidade", label: data.collection.title },
            ]}
          />
          <ComunEntityHeader context={context} />
          <ComunRelatedSection title="Itens da coleção">
            {data.items.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.items.map((item) => (
                  <ComunMemoryCard
                    key={item.id}
                    href={withComunAppV2(`/comun/acervo/${item.slug}`)}
                    title={item.title}
                    summary={item.summary ?? archiveDate(item)}
                    context={`${item.item_type} · ${archiveDate(item)}`}
                  />
                ))}
              </div>
            ) : (
              <ComunEmptyStateV2
                title="Coleção sem itens públicos"
                explanation="A coleção existe, mas nenhum item está publicável neste recorte."
                action={{ href: "/comun/acervo", label: "Explorar o Acervo" }}
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
        <Link
          href="/comun/acervo/colecoes"
          className="font-black uppercase text-comun-yellow"
        >
          ← Coleções
        </Link>
        <h1 className="mt-3 text-4xl font-black uppercase">
          {data.collection.title}
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          {data.collection.description || data.collection.summary}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={`/comun/acervo/${item.slug}`}
              className="paper-panel border-2 border-comun-black p-4"
            >
              <p className="text-xs font-black uppercase text-comun-rust">
                {item.item_type} · {archiveDate(item)}
              </p>
              <h2 className="mt-2 font-black uppercase">{item.title}</h2>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
