import Link from "next/link";
import { notFound } from "next/navigation";
import { createPautaDossierReviewAction, preparePautaDossierPublicVersionAction, regeneratePautaDossierDraftAction, removePautaDossierEvidenceAction, updatePautaDossierAction, updatePautaDossierWorkflowAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { getAdminPautaDossier } from "@/lib/pauta-dossiers";

const statusOptions = ["draft", "in_review", "ready", "archived"];
const checklist = [
  ["no_raw_text", "Nao publicar raw_text."],
  ["no_private_contact", "Nao publicar private_contact."],
  ["no_response_text", "Nao publicar response_text completo."],
  ["no_internal_notes", "Nao publicar internal_notes."],
  ["public_safe_evidence", "Usar apenas evidencias approved + public_safe."],
  ["protocol_summary_only", "Protocolos oficiais aparecem somente com resumo publico."],
] as const;
const factualChecklist = [
  ["public_evidence_reviewed", "Evidencias publicas revisadas"],
  ["no_personal_data", "Sem dado pessoal"],
  ["no_private_contact", "Sem contato privado"],
  ["no_full_response", "Sem resposta oficial completa"],
  ["no_unsupported_accusation", "Sem acusacao sem base"],
  ["fact_report_demand_distinction", "Distincao entre fato, relato e demanda"],
  ["public_names_checked", "Links/nomes publicos conferidos, quando houver"],
] as const;
const editorialChecklist = [
  ["clear_text", "Texto claro"],
  ["objective_language", "Linguagem objetiva"],
  ["adequate_title", "Titulo adequado"],
  ["faithful_summary", "Resumo fiel"],
  ["clear_demands", "Demandas compreensiveis"],
  ["clear_next_step", "Proximo passo claro"],
  ["no_unnecessary_exposure", "Sem exposicao desnecessaria"],
] as const;

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
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Dossie por pauta / {dossier.review_status}</p>
          <h1 className="text-3xl font-black uppercase">{dossier.title}</h1>
          {dossier.pauta ? <p className="mt-1 text-sm font-bold text-comun-asphalt/70">Pauta: {dossier.pauta.title}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {dossier.pauta ? <Link href={`/comun/admin/pautas/${dossier.pauta.id}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir pauta</Link> : null}
          <Link href={`/comun/admin/dossies/${dossier.id}/preview`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Preview admin</Link>
          {dossier.review_status === "published" && dossier.public_slug ? <Link href={`/comun/dossies/${dossier.public_slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir publico</Link> : null}
        </div>
      </div>

      <section className="mt-5 border-2 border-comun-black bg-comun-black p-4 text-comun-paper">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase text-comun-yellow">Workflow editorial</h2>
            <p className="mt-1 text-sm text-comun-paper/70">Status: {dossier.review_status}. Publicacao exige versao publica preparada, aprovada e separada do rascunho interno.</p>
            <p className="mt-1 text-xs font-bold uppercase text-comun-paper/60">
              Revisao factual: {dossier.review_state.factualApproved ? `aprovada por ${dossier.review_state.factualReviewer}` : "pendente"} / revisao editorial: {dossier.review_state.editorialApproved ? `aprovada por ${dossier.review_state.editorialReviewer}` : "pendente"} / revisores distintos: {dossier.review_state.reviewersDistinct ? "sim" : "nao"}
            </p>
            {dossier.published_at ? <p className="mt-1 text-xs font-bold uppercase text-comun-paper/60">Publicado em {new Date(dossier.published_at).toLocaleString("pt-BR")}</p> : null}
          </div>
          <form action={preparePautaDossierPublicVersionAction}>
            <input type="hidden" name="dossier_id" value={dossier.id} />
            <button className="min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow">Preparar versao publica a partir do rascunho</button>
          </form>
        </div>
        <form action={updatePautaDossierWorkflowAction} className="mt-4 grid gap-3 border-2 border-comun-yellow p-3">
          <input type="hidden" name="dossier_id" value={dossier.id} />
          <div className="grid gap-2 md:grid-cols-2">
            {checklist.map(([value, item]) => (
              <label key={value} className="flex items-start gap-2 text-sm font-bold">
                <input type="checkbox" name="safety_check" value={value} className="mt-1" />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button name="intent" value="send_to_review" className="min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow">Enviar para revisao</button>
            <button name="intent" value="changes_requested" className="min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow">Solicitar ajustes</button>
            <button name="intent" value="approve" className="min-h-10 border-2 border-comun-yellow bg-comun-yellow px-3 text-xs font-black uppercase text-comun-black">Aprovar</button>
            <button name="intent" value="publish" className="min-h-10 border-2 border-comun-yellow bg-comun-yellow px-3 text-xs font-black uppercase text-comun-black">Publicar</button>
            <button name="intent" value="unpublish" className="min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow">Despublicar</button>
            <button name="intent" value="archive" className="min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow">Arquivar</button>
          </div>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Revisoes editoriais</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <ReviewForm title="Registrar revisao factual" stage="factual_review" dossierId={dossier.id} checklist={factualChecklist} />
          <ReviewForm title="Registrar revisao editorial" stage="editorial_review" dossierId={dossier.id} checklist={editorialChecklist} />
        </div>
        <div className="mt-4 grid gap-3">
          {dossier.reviews.map((review) => (
            <article key={review.id} className="border-2 border-comun-black bg-white p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{review.review_stage} / {review.decision} / {new Date(review.created_at).toLocaleString("pt-BR")}</p>
              <h3 className="mt-1 font-black uppercase">{review.reviewer_name}{review.reviewer_role ? ` - ${review.reviewer_role}` : ""}</h3>
              {review.notes ? <p className="mt-2 text-sm text-comun-asphalt/75">{review.notes}</p> : null}
              <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/60">Checklist: {Object.keys(review.checklist ?? {}).filter((key) => review.checklist[key]).join(", ") || "-"}</p>
            </article>
          ))}
          {!dossier.reviews.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhuma revisao registrada ainda.</p> : null}
        </div>
      </section>

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
        <div className="border-t-2 border-comun-black pt-3 md:col-span-2">
          <h2 className="text-lg font-black uppercase">Versao publica revisada</h2>
          <p className="mt-1 text-xs font-bold uppercase text-comun-asphalt/60">A rota publica usa somente estes campos. Edicoes no rascunho interno nao atualizam a publicacao automaticamente.</p>
        </div>
        <Input name="public_title" label="Titulo publico" defaultValue={dossier.public_title ?? ""} />
        <Input name="public_slug" label="Slug publico" defaultValue={dossier.public_slug ?? ""} />
        <Textarea name="public_summary" label="Resumo publico" defaultValue={dossier.public_summary ?? ""} />
        <Textarea name="public_body" label="Corpo publico revisado" defaultValue={dossier.public_body ?? ""} rows={12} />
        <Textarea name="publication_notes" label="Notas de publicacao" defaultValue={dossier.publication_notes ?? ""} rows={3} />
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
            {checklist.map(([value, item]) => (
              <label key={value} className="flex items-start gap-2 text-sm font-bold">
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

function ReviewForm({ title, stage, dossierId, checklist: items }: { title: string; stage: string; dossierId: string; checklist: readonly (readonly [string, string])[] }) {
  return (
    <form action={createPautaDossierReviewAction} className="grid gap-3 border-2 border-comun-black bg-white p-4">
      <input type="hidden" name="dossier_id" value={dossierId} />
      <input type="hidden" name="review_stage" value={stage} />
      <h3 className="font-black uppercase">{title}</h3>
      <Input name="reviewer_name" label="Revisor" />
      <Input name="reviewer_role" label="Papel/funcao" />
      <label className="grid gap-1 text-sm font-black uppercase">Decisao<select name="decision" defaultValue="approved" className="min-h-11 border-2 border-comun-black px-2"><option value="approved">approved</option><option value="changes_requested">changes_requested</option><option value="rejected">rejected</option></select></label>
      <div className="grid gap-2">
        {items.map(([value, label]) => (
          <label key={value} className="flex items-start gap-2 text-sm font-bold">
            <input type="checkbox" name="review_checklist" value={value} className="mt-1" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <Textarea name="notes" label="Notas da revisao" rows={3} />
      <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Registrar revisao</button>
    </form>
  );
}
