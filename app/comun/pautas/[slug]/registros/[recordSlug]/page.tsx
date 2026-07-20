import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { getPublicSidewalkRecordDetail } from "@/lib/sidewalk-pauta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SidewalkRecordPage({
  params,
}: {
  params: Promise<{ slug: string; recordSlug: string }>;
}) {
  const { slug, recordSlug } = await params;
  const detail = await getPublicSidewalkRecordDetail(slug, recordSlug);
  if (!detail) notFound();
  const { record, publicPhotoUrl, actions, results } = detail as { record: any; publicPhotoUrl: string | null; actions: any[]; results: any[] };
  return (
    <ComunShell>
      <main className="bg-comun-paper text-comun-black">
        <section className="border-b-2 border-comun-black bg-comun-yellow">
          <div className="mx-auto max-w-6xl px-4 py-9 sm:py-14">
            <Link href={`/comun/pautas/${slug}`} className="text-sm font-bold underline">Voltar para a pauta</Link>
            <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">{record.name}</h1>
            <p className="mt-5 max-w-3xl text-lg font-medium">{record.public_summary}</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-10">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-2 border-comun-black p-4"><dt className="text-xs font-black uppercase">Categoria</dt><dd className="font-black">{record.categories.join(" · ")}</dd></div>
            <div className="border-2 border-comun-black p-4"><dt className="text-xs font-black uppercase">Impacto</dt><dd className="font-black">{record.impact_level}</dd></div>
            <div className="border-2 border-comun-black p-4"><dt className="text-xs font-black uppercase">Status</dt><dd className="font-black">{record.status}</dd></div>
            <div className="border-2 border-comun-black p-4"><dt className="text-xs font-black uppercase">Verificação</dt><dd className="font-black">{record.verification_status}</dd></div>
          </dl>
          {publicPhotoUrl ? (
            <figure className="mt-6 border-2 border-comun-black p-2">
              <Image unoptimized width={960} height={720} src={publicPhotoUrl} alt={record.public_alt_text || "Imagem aproximada do trecho de calçada"} className="h-auto w-full max-w-2xl" />
              <figcaption className="mt-2 text-xs text-comun-black/70">Localização aproximada. Imagem revisada antes da publicação.</figcaption>
            </figure>
          ) : null}
          <h2 className="mt-10 text-2xl font-black uppercase">Ações</h2>
          <div className="mt-4 grid gap-3">
            {actions.map((action: any) => (
              <article key={action.id} className="border-2 border-comun-black p-4">
                <p className="text-xs font-black uppercase">{action.status}</p>
                <h3 className="font-black uppercase">{action.title}</h3>
                <p className="mt-2 text-sm">{action.objective_public}</p>
              </article>
            ))}
            {!actions.length ? <p className="text-sm text-comun-black/70">Nenhuma ação pública vinculada ainda.</p> : null}
          </div>
          <h2 className="mt-10 text-2xl font-black uppercase">Resultados</h2>
          <div className="mt-4 grid gap-3">
            {results.map((result: any) => (
              <article key={result.id} className="border-2 border-comun-black p-4">
                <p className="text-xs font-black uppercase">{result.result_type} · {result.verification_status}</p>
                <h3 className="font-black uppercase">{result.title}</h3>
                <p className="mt-2 text-sm">{result.public_summary}</p>
              </article>
            ))}
            {!results.length ? <p className="text-sm text-comun-black/70">Nenhum resultado público registrado ainda.</p> : null}
          </div>
          <p className="mt-10 text-xs text-comun-black/70">
            Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território.
          </p>
        </section>
      </main>
    </ComunShell>
  );
}
