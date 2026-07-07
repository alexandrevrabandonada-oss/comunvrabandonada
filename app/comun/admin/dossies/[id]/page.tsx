import Link from "next/link";
import { notFound } from "next/navigation";
import { regeneratePautaDossierDraftAction, removePautaDossierEvidenceAction, updatePautaDossierAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { getAdminPautaDossier } from "@/lib/pauta-dossiers";

const statusOptions = ["draft", "in_review", "ready", "archived"];
const checklist = [
  "Nao publicar raw_text.",
  "Nao publicar private_contact.",
  "Nao publicar response_text completo.",
  "Nao publicar internal_notes.",
  "Usar apenas evidencias approved + public_safe.",
  "Protocolos oficiais aparecem somente com resumo publico.",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDossierDetailPage({ params }: { params: { id: string } }) {
  const session = await requireComunAdmin();
  const dossier = await getAdminPautaDossier(params.id);
  if (!dossier) notFound();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Dossie por pauta / {dossier.status}</p>
          <h1 className="text-3xl font-black uppercase">{dossier.title}</h1>
          {dossier.pauta ? <p className="mt-1 text-sm font-bold text-comun-asphalt/70">Pauta: {dossier.pauta.title}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {dossier.pauta ? <Link href={`/comun/admin/pautas/${dossier.pauta.id}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir pauta</Link> : null}
          <Link href={`/comun/admin/dossies/${dossier.id}/preview`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Preview admin</Link>
        </div>
      </div>

      <form action={updatePautaDossierAction} className="mt-5 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
        <input type="hidden" name="dossier_id" value={dossier.id} />
        <input type="hidden" name="pauta_id" value={dossier.pauta_id} />
        <Input name="title" label="Titulo" defaultValue={dossier.title} />
        <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" defaultValue={dossier.status} className="min-h-11 border-2 border-comun-black px-2">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <Textarea name="executive_summary" label="Sintese executiva" defaultValue={dossier.executive_summary ?? ""} />
        <Textarea name="problem_statement" label="Problema" defaultValue={dossier.problem_statement ?? ""} />
        <Textarea name="affected_communities" label="Comunidades afetadas" defaultValue={dossier.affected_communities ?? ""} />
        <Textarea name="evidence_summary" label="Evidencias" defaultValue={dossier.evidence_summary ?? ""} />
        <Textarea name="official_protocols_summary" label="Protocolos oficiais sanitizados" defaultValue={dossier.official_protocols_summary ?? ""} />
        <Textarea name="demands" label="Demandas" defaultValue={dossier.demands ?? ""} />
        <Textarea name="next_steps" label="Proximos passos" defaultValue={dossier.next_steps ?? ""} />
        <Textarea name="public_version" label="Versao publica em rascunho" defaultValue={dossier.public_version ?? ""} rows={12} />
        <Textarea name="internal_notes" label="Notas internas" defaultValue={dossier.internal_notes ?? ""} rows={5} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Salvar dossie</button>
      </form>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black uppercase">Evidencias incluidas</h2>
            <form action={regeneratePautaDossierDraftAction}>
              <input type="hidden" name="dossier_id" value={dossier.id} />
              <input type="hidden" name="pauta_id" value={dossier.pauta_id} />
              <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-xs font-black uppercase">Regenerar do zero</button>
            </form>
          </div>
          <div className="mt-3 grid gap-3">
            {dossier.evidence_items.map((item) => (
              <article key={item.id} className="border-2 border-comun-black bg-white p-4">
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{item.evidence?.evidence_type ?? "evidencia"} / {item.evidence?.status ?? "-"} / {item.evidence?.sensitivity ?? "-"}</p>
                <h3 className="mt-1 font-black uppercase">{item.evidence?.title ?? "Evidencia removida"}</h3>
                {item.evidence?.summary ? <p className="mt-2 text-sm text-comun-asphalt/75">{item.evidence.summary}</p> : null}
                {item.evidence?.public_note ? <p className="mt-2 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">{item.evidence.public_note}</p> : null}
                <form action={removePautaDossierEvidenceAction} className="mt-3">
                  <input type="hidden" name="dossier_id" value={dossier.id} />
                  <input type="hidden" name="evidence_id" value={item.evidence_id} />
                  <button className="border-2 border-comun-black px-3 py-2 text-xs font-black uppercase">Remover evidencia</button>
                </form>
              </article>
            ))}
            {!dossier.evidence_items.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhuma evidencia incluida.</p> : null}
          </div>
        </div>
        <aside className="border-2 border-comun-black bg-comun-black p-4 text-comun-paper">
          <h2 className="font-black uppercase text-comun-yellow">Checklist</h2>
          <div className="mt-3 grid gap-2">
            {checklist.map((item) => (
              <label key={item} className="flex items-start gap-2 text-sm font-bold">
                <input type="checkbox" className="mt-1" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </aside>
      </section>
    </AdminShell>
  );
}

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-3" /></label>;
}

function Textarea({ name, label, defaultValue = "", rows = 4 }: { name: string; label: string; defaultValue?: string; rows?: number }) {
  return <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">{label}<textarea name={name} defaultValue={defaultValue} rows={rows} className="border-2 border-comun-black p-3" /></label>;
}
