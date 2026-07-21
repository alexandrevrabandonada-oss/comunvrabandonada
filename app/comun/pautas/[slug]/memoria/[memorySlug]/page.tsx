import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { getPublicSidewalkMemoryDetail } from "@/lib/sidewalk-pauta";
import { ComunContextTrail } from "@/components/comun-context-trail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SidewalkMemoryPage({
  params,
}: {
  params: Promise<{ slug: string; memorySlug: string }>;
}) {
  const { slug, memorySlug } = await params;
  const memory = await getPublicSidewalkMemoryDetail(slug, memorySlug);
  if (!memory) notFound();
  return (
    <ComunShell>
      <main className="bg-comun-paper text-comun-black">
        <section className="border-b-2 border-comun-black bg-comun-yellow">
          <div className="mx-auto max-w-6xl px-4 py-9 sm:py-14">
            <ComunContextTrail
              tone="light"
              items={[
                {
                  kind: "território",
                  label: "Volta Redonda",
                  href: "/comun/territorios/volta-redonda",
                },
                {
                  kind: "comunidade",
                  label: "Cidade",
                  href: "/comun/c/cidade",
                },
                {
                  kind: "pauta",
                  label: "Calçadas em circulação",
                  href: `/comun/pautas/${slug}`,
                },
                {
                  kind: "ferramenta",
                  label: "Mapa das Calçadas",
                  href: "/comun/calcadas",
                },
                { kind: "entidade", label: memory.title },
              ]}
            />
            <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">
              {memory.title}
            </h1>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-10">
          <p className="max-w-3xl text-lg">{memory.public_summary}</p>
          {memory.methodology_snapshot ? (
            <p className="mt-6 text-sm font-bold">
              Metodologia: {memory.methodology_snapshot}
            </p>
          ) : null}
          <p className="mt-10 text-xs text-comun-black/70">
            Os dados representam contribuições recebidas e verificadas pelo
            projeto e não constituem levantamento completo do território.
          </p>
        </section>
      </main>
    </ComunShell>
  );
}
