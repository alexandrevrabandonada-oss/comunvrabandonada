import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunMemoryCard } from "@/components/comun-cards";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { listPublicCollections } from "@/lib/archive";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
export const dynamic = "force-dynamic";
export default async function Collections({
  searchParams,
}: {
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const list = await listPublicCollections();
  const appV2 = isComunAppV2((await searchParams).experiencia);
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Coleções",
          contextLabel: "Acervo · recortes editoriais",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Coleções editoriais"
          summary="Recortes de memória publicados com curadoria, fonte e direitos."
        >
          {list.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((collection) => (
                <ComunMemoryCard
                  key={collection.id}
                  href={withComunAppV2(
                    `/comun/acervo/colecoes/${collection.slug}`,
                  )}
                  title={collection.title}
                  summary={collection.summary ?? "Coleção editorial publicada."}
                  context="Coleção do Acervo"
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma coleção editorial publicada"
              explanation="Coleções aparecem depois de curadoria e revisão dos itens que as compõem."
              related="Itens individuais e campanhas de identificação possuem estados separados."
              action={{ href: "/comun/acervo", label: "Explorar o Acervo" }}
              secondaryActions={[
                { href: "/comun/acervo/contribuir", label: "Enviar memória" },
              ]}
            />
          )}
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <Section>
        <Link
          href="/comun/acervo"
          className="font-black uppercase text-comun-yellow"
        >
          ← Acervo
        </Link>
        <h1 className="mt-3 text-4xl font-black uppercase">
          Coleções editoriais
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((collection) => (
            <Link
              href={`/comun/acervo/colecoes/${collection.slug}`}
              key={collection.id}
              className="paper-panel border-2 border-comun-black p-5"
            >
              <h2 className="text-xl font-black uppercase">
                {collection.title}
              </h2>
              <p className="mt-2 text-sm text-comun-asphalt/75">
                {collection.summary}
              </p>
            </Link>
          ))}
        </div>
        {!list.length ? (
          <p className="mt-6 text-comun-paper/70">
            Nenhuma coleção publicada ainda.
          </p>
        ) : null}
      </Section>
    </ComunShell>
  );
}
