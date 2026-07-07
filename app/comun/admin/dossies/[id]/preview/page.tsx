import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { getAdminPautaDossier } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDossierPreviewPage({ params }: { params: { id: string } }) {
  const session = await requireComunAdmin();
  const dossier = await getAdminPautaDossier(params.id);
  if (!dossier) notFound();
  const publicEvidence = dossier.evidence_items.filter((item) => item.evidence?.status === "approved" && item.evidence.sensitivity === "public_safe");

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Preview admin / nao publicado</p>
          <h1 className="text-3xl font-black uppercase">{dossier.title}</h1>
        </div>
        <Link href={`/comun/admin/dossies/${dossier.id}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Voltar ao editor</Link>
      </div>

      <article className="mt-5 border-2 border-comun-black bg-white p-5">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-comun-asphalt">{dossier.public_version || "Versao publica ainda nao preenchida."}</pre>
      </article>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Evidencias publicas no preview</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {publicEvidence.map((item) => (
            <article key={item.id} className="border-2 border-comun-black bg-white p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{item.evidence?.evidence_type}</p>
              <h3 className="font-black uppercase">{item.evidence?.title}</h3>
              {item.evidence?.summary ? <p className="mt-2 text-sm text-comun-asphalt/75">{item.evidence.summary}</p> : null}
              {item.evidence?.public_note ? <p className="mt-2 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">{item.evidence.public_note}</p> : null}
            </article>
          ))}
          {!publicEvidence.length ? <p className="border-2 border-comun-black bg-white p-4">Sem evidencias publicas incluidas.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
