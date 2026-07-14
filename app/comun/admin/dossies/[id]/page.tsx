import Link from "next/link";
import { notFound } from "next/navigation";
import { createPautaDossierReviewAction, preparePautaDossierPublicVersionAction, regeneratePautaDossierDraftAction, removePautaDossierEvidenceAction, rollbackPautaDossierPublicationSnapshotAction, savePautaDossierFinalPublicationChecklistAction, updateDossierPublicationSnapshotPublicNoteAction, updatePautaDossierAction, updatePautaDossierReviewOpsAction, updatePautaDossierWorkflowAction, upsertPublicDossierFeatureAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { listActiveAdminProfiles } from "@/lib/admin-profiles";
import { getAdminPautaDossier, listDossierPublicFeatures } from "@/lib/pauta-dossiers";
import type { ComunAdminProfile } from "@/lib/types";

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
const finalPublicationChecklist = [
  ["title_reviewed", "Titulo publico revisado"],
  ["summary_reviewed", "Resumo publico revisado"],
  ["body_reviewed", "Corpo publico revisado"],
  ["slug_reviewed", "Slug publico revisado"],
  ["no_raw_text", "Sem raw_text"],
  ["no_private_contact", "Sem private_contact"],
  ["no_full_response_text", "Sem response_text completo"],
  ["no_internal_notes", "Sem internal_notes"],
  ["no_signed_url", "Sem signed URL"],
  ["no_storage_path", "Sem storage_path"],
  ["evidence_public_safe", "Evidencias approved + public_safe"],
  ["distinct_real_reviewers", "Revisores reais distintos confirmados"],
  ["publisher_confirmed", "Publisher/admin confirmou publicacao"],
] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDossierDetailPage(
  props: { params: Promise<{ id: string }>; searchParams?: Promise<{ compare_snapshot?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await requireComunAdmin();
  const dossier = await getAdminPautaDossier(params.id);
  if (!dossier) notFound();
  const profiles = await listActiveAdminProfiles();
  const activeSnapshot = dossier.active_publication_snapshot;
  const publicFeatures = await listDossierPublicFeatures(dossier.publication_snapshots.map((snapshot) => snapshot.id));
  const featureBySnapshotId = new Map(publicFeatures.map((feature) => [feature.snapshot_id, feature]));
  const finalChecklistMissing = finalPublicationChecklist.filter(([value]) => !dossier.final_publication_checklist?.[value]);
  if (searchParams?.compare_snapshot) {
    await logComunAdminAction({
      session,
      action: "dossier_publication_diff_viewed",
      targetType: "pauta_dossier",
      targetId: dossier.id,
      metadata: { compare_snapshot_id: searchParams.compare_snapshot, has_active_snapshot: Boolean(activeSnapshot) },
    });
  }

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Dossie por pauta / {dossier.review_status}</p>
          <h1 className="text-3xl font-black uppercase">{dossier.title}</h1>
          {dossier.pauta ? <p className="mt-1 text-sm font-bold text-comun-asphalt/70">Pauta: {dossier.pauta.title}</p> : null}
          <p className="mt-1 text-xs font-black uppercase text-comun-asphalt/60">Usuario: {session.profile ? `${session.profile.display_name} / ${session.profile.role}` : "perfil nao vinculado"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dossier.pauta ? <Link href={`/comun/admin/pautas/${dossier.pauta.id}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir pauta</Link> : null}
          {dossier.pauta ? <Link href={`/comun/dossies?pauta=${encodeURIComponent(dossier.pauta.title)}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Ver dossies publicos relacionados</Link> : null}
          <Link href="/comun/dossies" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Ver pagina publica de dossies</Link>
          <Link href={`/comun/admin/dossies/${dossier.id}/preview`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Preview admin</Link>
          {activeSnapshot ? <Link href={`/comun/dossies/${activeSnapshot.public_slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir publico</Link> : null}
        </div>
      </div>

      <section className="mt-5 border-2 border-comun-black bg-comun-black p-4 text-comun-paper">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase text-comun-yellow">Workflow editorial</h2>
            <p className="mt-1 text-sm text-comun-paper/70">Status: {dossier.review_status}. Publicacao exige versao publica preparada, aprovada e separada do rascunho interno.</p>
            <p className="mt-1 text-xs font-bold uppercase text-comun-paper/60">
              Revisao factual: {dossier.review_state.factualApproved ? `aprovada por ${dossier.review_state.factualReviewer}${dossier.review_state.factualReviewerUserId ? "" : " (legado / nao vinculado)"}` : "pendente"} / revisao editorial: {dossier.review_state.editorialApproved ? `aprovada por ${dossier.review_state.editorialReviewer}${dossier.review_state.editorialReviewerUserId ? "" : " (legado / nao vinculado)"}` : "pendente"} / identidades distintas: {dossier.review_state.reviewerUsersDistinct ? "sim" : "nao"}
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
          <Textarea name="unpublish_reason" label="Motivo para despublicar" rows={2} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="public_version_label" label="Rotulo publico da versao" defaultValue="Versao revisada" />
            <Textarea name="public_change_note" label="Resumo publico da mudanca" rows={2} />
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

      <section className="mt-6 border-2 border-comun-black bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase">Checklist final de publicacao</h2>
            <p className="mt-1 text-sm text-comun-asphalt/70">A publicacao assistida cria um snapshot imutavel. Edicoes posteriores no dossie nao alteram a pagina publica ate nova publicacao.</p>
          </div>
          <p className={`border-2 border-comun-black px-3 py-2 text-xs font-black uppercase ${finalChecklistMissing.length ? "bg-white" : "bg-comun-yellow"}`}>
            {finalChecklistMissing.length ? `${finalChecklistMissing.length} pendencia(s)` : "Checklist completo"}
          </p>
        </div>
        <form action={savePautaDossierFinalPublicationChecklistAction} className="mt-4 grid gap-3">
          <input type="hidden" name="dossier_id" value={dossier.id} />
          <div className="grid gap-2 md:grid-cols-2">
            {finalPublicationChecklist.map(([value, label]) => (
              <label key={value} className="flex items-start gap-2 text-sm font-bold">
                <input type="checkbox" name="final_publication_checklist" value={value} defaultChecked={Boolean(dossier.final_publication_checklist?.[value])} className="mt-1" />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <Textarea name="final_publication_notes" label="Notas finais de publicacao" defaultValue={dossier.final_publication_notes ?? ""} rows={3} />
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">Salvar checklist final</button>
        </form>
      </section>

      <section className="mt-6 border-2 border-comun-black bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase">Operacao da revisao</h2>
            <p className="mt-1 text-sm text-comun-asphalt/70">Responsaveis, prioridade e prazo internos da fila administrativa.</p>
          </div>
          {dossier.review_due_at ? (
            <p className="border-2 border-comun-black px-3 py-2 text-xs font-black uppercase">
              Prazo: {new Date(dossier.review_due_at).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
        </div>
        <form action={updatePautaDossierReviewOpsAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="dossier_id" value={dossier.id} />
          <ProfileSelect name="factual_reviewer_assigned_user_id" label="Responsavel factual" profiles={profiles} defaultValue={dossier.factual_reviewer_assigned_user_id ?? ""} fallback={dossier.factual_reviewer_assigned} />
          <ProfileSelect name="editorial_reviewer_assigned_user_id" label="Responsavel editorial" profiles={profiles} defaultValue={dossier.editorial_reviewer_assigned_user_id ?? ""} fallback={dossier.editorial_reviewer_assigned} />
          <input type="hidden" name="factual_reviewer_assigned" value={profileSnapshot(profiles, dossier.factual_reviewer_assigned_user_id) || dossier.factual_reviewer_assigned || ""} />
          <input type="hidden" name="editorial_reviewer_assigned" value={profileSnapshot(profiles, dossier.editorial_reviewer_assigned_user_id) || dossier.editorial_reviewer_assigned || ""} />
          <label className="grid gap-1 text-sm font-black uppercase">
            Prioridade
            <select name="review_priority" defaultValue={dossier.review_priority} className="min-h-11 border-2 border-comun-black px-2">
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <Input name="review_due_at" label="Prazo" type="date" defaultValue={toDateInputValue(dossier.review_due_at)} />
          <Textarea name="review_notes_internal" label="Nota operacional interna" defaultValue={dossier.review_notes_internal ?? ""} rows={3} />
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Salvar operacao da revisao</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Revisoes editoriais</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <ReviewForm title="Registrar revisao factual" stage="factual_review" dossierId={dossier.id} checklist={factualChecklist} reviewerLabel={session.profile ? `${session.profile.display_name} (${session.profile.role})` : "Perfil nao vinculado"} />
          <ReviewForm title="Registrar revisao editorial" stage="editorial_review" dossierId={dossier.id} checklist={editorialChecklist} reviewerLabel={session.profile ? `${session.profile.display_name} (${session.profile.role})` : "Perfil nao vinculado"} />
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

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black uppercase">Historico de publicacao</h2>
          <div className="mt-3 grid gap-3">
            {dossier.publication_snapshots.map((snapshot) => (
              <article key={snapshot.id} className="border-2 border-comun-black p-3">
                {(() => {
                  const feature = featureBySnapshotId.get(snapshot.id);
                  const canFeature = ["published", "rollback"].includes(snapshot.snapshot_status) && !snapshot.unpublished_at;
                  return canFeature ? (
                    <form action={upsertPublicDossierFeatureAction} className="mb-3 grid gap-2 border-2 border-comun-black bg-comun-paper p-3">
                      <input type="hidden" name="dossier_id" value={dossier.id} />
                      <input type="hidden" name="snapshot_id" value={snapshot.id} />
                      <h4 className="text-sm font-black uppercase">Destaque publico</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input name="public_label" label="Rotulo publico curto" defaultValue={feature?.public_label ?? ""} />
                        <Input name="priority" label="Prioridade" type="number" defaultValue={String(feature?.priority ?? 100)} />
                      </div>
                      <Textarea name="public_note" label="Nota publica segura" defaultValue={feature?.public_note ?? ""} rows={2} />
                      <label className="flex items-center gap-2 text-xs font-black uppercase">
                        <input type="checkbox" name="active" defaultChecked={feature?.active ?? false} />
                        Ativar destaque publico
                      </label>
                      <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Salvar destaque publico</button>
                    </form>
                  ) : null;
                })()}
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{snapshot.snapshot_status} / {new Date(snapshot.published_at).toLocaleString("pt-BR")}</p>
                <h3 className="mt-1 font-black uppercase">{snapshot.public_title}</h3>
                <p className="mt-1 text-xs font-bold text-comun-asphalt/65">Slug: {snapshot.public_slug} / Publicado por: {snapshot.published_by_name_snapshot ?? "-"}</p>
                <p className="mt-1 text-xs font-bold text-comun-asphalt/65">Publico: {snapshot.public_version_label || "Versao revisada"} / atualizado em {new Date(snapshot.public_updated_at ?? snapshot.published_at).toLocaleString("pt-BR")}</p>
                {snapshot.public_change_note ? <p className="mt-2 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">{snapshot.public_change_note}</p> : null}
                {snapshot.unpublished_at ? <p className="mt-1 text-xs font-bold text-comun-asphalt/65">Despublicado em {new Date(snapshot.unpublished_at).toLocaleString("pt-BR")} / motivo: {snapshot.unpublish_reason}</p> : null}
                <form action={updateDossierPublicationSnapshotPublicNoteAction} className="mt-3 grid gap-2 border-t-2 border-comun-black pt-3">
                  <input type="hidden" name="dossier_id" value={dossier.id} />
                  <input type="hidden" name="snapshot_id" value={snapshot.id} />
                  <Input name="public_version_label" label="Rotulo publico" defaultValue={snapshot.public_version_label || "Versao revisada"} />
                  <Input name="public_updated_at" label="Data publica de atualizacao" type="date" defaultValue={toDateInputValue(snapshot.public_updated_at ?? snapshot.published_at)} />
                  <Textarea name="public_change_note" label="Resumo publico seguro da alteracao" defaultValue={snapshot.public_change_note ?? ""} rows={2} />
                  <button className="min-h-10 border-2 border-comun-black bg-white px-3 text-xs font-black uppercase">Salvar resumo publico</button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/comun/admin/dossies/${dossier.id}?compare_snapshot=${snapshot.id}`} className="border-2 border-comun-black px-3 py-2 text-xs font-black uppercase">Comparar</Link>
                  {snapshot.snapshot_status !== "published" && snapshot.snapshot_status !== "rollback" ? (
                    <form action={rollbackPautaDossierPublicationSnapshotAction}>
                      <input type="hidden" name="dossier_id" value={dossier.id} />
                      <input type="hidden" name="snapshot_id" value={snapshot.id} />
                      <button className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-xs font-black uppercase">Rollback para este</button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
            {!dossier.publication_snapshots.length ? <p className="border-2 border-comun-black p-4 text-sm">Nenhum snapshot publicado ainda.</p> : null}
          </div>
        </div>
        <aside className="border-2 border-comun-black bg-comun-black p-4 text-comun-paper">
          <h2 className="font-black uppercase text-comun-yellow">Comparacao</h2>
          <CompareRow label="Titulo" draft={dossier.public_title} snapshot={activeSnapshot?.public_title ?? null} />
          <CompareRow label="Resumo" draft={dossier.public_summary} snapshot={activeSnapshot?.public_summary ?? null} />
          <CompareRow label="Slug" draft={dossier.public_slug} snapshot={activeSnapshot?.public_slug ?? null} />
          <CompareRow label="Corpo" draft={dossier.public_body} snapshot={activeSnapshot?.public_body ?? null} />
        </aside>
      </section>

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

function Input({ name, label, defaultValue = "", type = "text" }: { name: string; label: string; defaultValue?: string; type?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input name={name} type={type} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-3" /></label>;
}

function Textarea({ name, label, defaultValue = "", rows = 4 }: { name: string; label: string; defaultValue?: string; rows?: number }) {
  return <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">{label}<textarea name={name} defaultValue={defaultValue} rows={rows} className="border-2 border-comun-black p-3" /></label>;
}

function ReviewForm({ title, stage, dossierId, checklist: items, reviewerLabel }: { title: string; stage: string; dossierId: string; checklist: readonly (readonly [string, string])[]; reviewerLabel: string }) {
  return (
    <form action={createPautaDossierReviewAction} className="grid gap-3 border-2 border-comun-black bg-white p-4">
      <input type="hidden" name="dossier_id" value={dossierId} />
      <input type="hidden" name="review_stage" value={stage} />
      <h3 className="font-black uppercase">{title}</h3>
      <p className="border-2 border-comun-black bg-comun-paper p-3 text-sm font-bold">Revisor autenticado: {reviewerLabel}</p>
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

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function ProfileSelect({ name, label, profiles, defaultValue, fallback }: { name: string; label: string; profiles: ComunAdminProfile[]; defaultValue: string; fallback?: string | null }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-2">
        <option value="">Sem perfil vinculado</option>
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} - {profile.email} ({profile.role})</option>)}
      </select>
      {fallback && !defaultValue ? <span className="text-xs font-bold text-comun-asphalt/60">Legado textual: {fallback}</span> : null}
    </label>
  );
}

function profileSnapshot(profiles: ComunAdminProfile[], id: string | null) {
  const profile = profiles.find((item) => item.id === id);
  return profile ? `${profile.display_name} <${profile.email}>` : "";
}

function CompareRow({ label, draft, snapshot }: { label: string; draft: string | null; snapshot: string | null }) {
  const changed = (draft ?? "") !== (snapshot ?? "");
  return (
    <div className="mt-3 border-2 border-comun-yellow p-3">
      <p className="text-xs font-black uppercase text-comun-yellow">{label} / {changed ? "diferente" : "igual"}</p>
      <p className="mt-2 text-xs font-bold text-comun-paper/60">Rascunho atual</p>
      <p className="whitespace-pre-wrap text-sm text-comun-paper/85">{draft || "-"}</p>
      <p className="mt-2 text-xs font-bold text-comun-paper/60">Snapshot ativo</p>
      <p className="whitespace-pre-wrap text-sm text-comun-paper/85">{snapshot || "-"}</p>
    </div>
  );
}
