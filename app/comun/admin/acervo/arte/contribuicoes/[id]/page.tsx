import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { resolveArtworkSubmissionReadiness } from "@/lib/archive/cultural-curation-readiness";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { linkArtworkSubmissionPrivateRoot, materializeArtworkSubmissionPrivateRoot } from "@/app/comun/admin/acervo/specialized-provenance-actions";

export const dynamic = "force-dynamic";
const existingKinds = new Set(["existing_work_complement", "credit_correction"]);
const slugSuggestion = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "obra-sem-titulo";
const blockerLabels: Record<string, string> = {
  material_incomplete: "Precisamos de título e contexto antes de continuar.",
  provenance_incomplete: "Precisamos registrar a origem desta contribuição.",
  private_root_source_ineligible: "O estado atual não permite criar ou vincular um rascunho.",
  private_root_editorial_decision_required: "A decisão editorial explícita acontece no botão abaixo.",
  artwork_existing_target_reconciliation_required: "Escolha uma obra existente para receber esta contribuição.",
};

export default async function ArtworkContributionDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const { id } = await params;
  const db = createServiceSupabaseClient();
  if (!db) notFound();
  const { data: submission } = await db.from("comun_archive_artwork_submissions")
    .select("id,public_protocol,submission_kind,title_suggestion,artwork_type,context_suggestion,status,creator_credit_suggestion,territory_id,authorship_source,archive_item_id,rights_state,publication_scope,reuse_permission,license_code")
    .eq("id", id).maybeSingle();
  if (!submission) notFound();
  const linked = Boolean(submission.archive_item_id);
  const existing = existingKinds.has(submission.submission_kind);
  const decisionReadiness = resolveArtworkSubmissionReadiness(submission, { explicitEditorialDecision: true });
  const { data: compatibleRoots } = existing && !linked
    ? await db.from("comun_archive_items").select("id,title,slug,comun_archive_artworks!inner(archive_item_id)")
      .eq("item_type", "territorial_artwork").eq("status", "draft").eq("visibility", "private").order("title")
    : { data: [] };
  const visibleBlockers = decisionReadiness.blockers.filter((code) =>
    !["rights_review_required", "review_only", "authorship_unconfirmed", "asset_not_ready", "safety_review_required"].includes(code));

  return <AdminShell adminEmail={session.admin.email}>
    <Link href="/comun/admin/acervo/arte/contribuicoes">← contribuições de arte</Link>
    <h1 className="mt-4 text-3xl font-black uppercase">{submission.title_suggestion}</h1>
    <p>{submission.public_protocol} · {submission.submission_kind} · {submission.status}</p>
    <section className="mt-5 border-2 bg-white p-5"><h2 className="font-black uppercase">Contexto e proveniência</h2>
      <p>{submission.context_suggestion || "Sem contexto adicional."}</p>
      <p className="mt-2 text-sm">Crédito sugerido: {submission.creator_credit_suggestion}. Esta sugestão não cria crédito canônico nem confirma autoria.</p>
    </section>
    <section className="mt-5 border-2 bg-white p-5"><h2 className="font-black uppercase">Situação editorial</h2>
      <p className="mt-2 font-bold">Publicação não está autorizada.</p>
      <p className="text-sm">Direitos, autoria, arquivos e revisão continuam separados do rascunho privado.</p>
    </section>
    {linked ? <section className="mt-5 border-2 border-emerald-800 bg-emerald-50 p-5">
      <h2 className="font-black uppercase">Rascunho privado vinculado</h2>
      <Link className="btn mt-4 inline-block" href={`/comun/admin/acervo/arte/${submission.archive_item_id}`}>Abrir rascunho privado</Link>
    </section> : existing ? <section className="mt-5 border-2 border-comun-black bg-white p-5">
      <h2 className="font-black uppercase">Vincular a uma obra existente</h2>
      <p className="mt-2">Esta contribuição pertence a uma obra existente. Escolha explicitamente o rascunho privado correto.</p>
      {compatibleRoots?.length ? <form action={linkArtworkSubmissionPrivateRoot} className="mt-4 grid gap-3">
        <input type="hidden" name="submission_id" value={submission.id} />
        <label>Obra existente<select name="target_id" required defaultValue="" className="mt-1 w-full border-2 border-comun-black p-2">
          <option value="" disabled>Escolha uma obra</option>
          {compatibleRoots.map((root) => <option key={root.id} value={root.id}>{root.title}</option>)}
        </select></label>
        <button className="min-h-12 bg-comun-yellow px-4 font-black uppercase">Vincular a uma obra existente</button>
      </form> : <p className="mt-4 border-l-4 border-amber-700 pl-3">Não há rascunho privado compatível disponível. Crie ou localize a obra no fluxo editorial antes de continuar.</p>}
    </section> : decisionReadiness.readyForPrivateRootCreation ? <section className="mt-5 border-2 border-comun-black bg-white p-5">
      <h2 className="font-black uppercase">Criar rascunho privado</h2>
      <p className="mt-2">Isso cria somente um rascunho privado. Não publica a obra.</p>
      <form action={materializeArtworkSubmissionPrivateRoot} className="mt-4 grid gap-3">
        <input type="hidden" name="submission_id" value={submission.id} />
        <label>Título<input name="title" required defaultValue={submission.title_suggestion} className="mt-1 w-full border-2 border-comun-black p-2" /></label>
        <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={slugSuggestion(submission.title_suggestion)} className="mt-1 w-full border-2 border-comun-black p-2" /></label>
        <button className="min-h-12 bg-comun-yellow px-4 font-black uppercase">Criar rascunho privado</button>
      </form>
    </section> : <section className="mt-5 border-2 border-amber-800 bg-amber-50 p-5">
      <h2 className="font-black uppercase">Precisamos de mais contexto</h2>
      <ul className="mt-2 list-disc pl-5">{visibleBlockers.map((code) => <li key={code}>{blockerLabels[code] || "Esta etapa precisa de revisão editorial antes de continuar."}</li>)}</ul>
    </section>}
  </AdminShell>;
}
