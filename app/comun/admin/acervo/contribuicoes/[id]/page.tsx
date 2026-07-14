import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  createArchiveItemFromSubmission,
  generateSubmissionDerivatives,
  updateSubmissionStatus,
} from "../actions";
export const dynamic = "force-dynamic";
export default async function SubmissionDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  const [{ data: submission }, { data: links }] = await Promise.all([
    db!
      .from("comun_archive_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    db!
      .from("comun_archive_submission_assets")
      .select(
        "id, upload_status, archive_asset_id, comun_archive_assets(id, asset_role, bucket_scope, mime_type, size_bytes, checksum_sha256, width, height, review_status, integrity_status)",
      )
      .eq("submission_id", id),
  ]);
  if (!submission) notFound();
  const original = links?.[0]?.comun_archive_assets as unknown as {
    id: string;
    checksum_sha256: string | null;
    mime_type: string;
    size_bytes: number;
    width: number;
    height: number;
    integrity_status: string;
  } | null;
  return (
    <AdminShell adminEmail={session.admin.email}>
      <p className="font-black uppercase text-comun-rust">
        ACERVO-{id.slice(0, 8)}
      </p>
      <h1 className="text-3xl font-black uppercase">
        {submission.title_suggestion}
      </h1>
      <p className="mt-2 font-black uppercase">
        {submission.status} · risco {submission.risk_level}
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="border-2 border-comun-black bg-white p-5">
          <h2 className="text-xl font-black uppercase">Material e contexto</h2>
          <p className="mt-3">{submission.description_suggestion}</p>
          <p className="mt-4 text-sm">
            {[
              submission.place_name,
              submission.neighborhood,
              submission.city,
              submission.approximate_date,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2">
            Fotografo: {submission.photographer_name || "desconhecido"}
          </p>
        </section>
        <section className="border-2 border-comun-black bg-white p-5">
          <h2 className="text-xl font-black uppercase">
            Procedencia e direitos
          </h2>
          <p className="mt-3">{submission.relationship_to_material}</p>
          <p className="mt-3">{submission.source_story}</p>
          <p className="mt-3 font-bold">{submission.rights_declaration}</p>
          <p className="mt-2">
            Fonte: {submission.source_name} · credito:{" "}
            {submission.contributor_credit_preference}
          </p>
        </section>
        <section className="border-2 border-comun-black bg-white p-5">
          <h2 className="text-xl font-black uppercase">Contato privado</h2>
          <p className="mt-3">
            {submission.contributor_name || "Nome nao informado"}
          </p>
          <p>
            {submission.contributor_contact_private || "Contato nao informado"}
          </p>
          <p className="text-sm">
            Contato autorizado: {submission.contact_authorized ? "sim" : "nao"}
          </p>
        </section>
        <section className="border-2 border-comun-black bg-white p-5">
          <h2 className="text-xl font-black uppercase">Original privado</h2>
          {original ? (
            <>
              <p className="mt-3">
                {original.mime_type} · {original.size_bytes} bytes ·{" "}
                {original.width}×{original.height}
              </p>
              <p className="text-sm">
                Checksum: {original.checksum_sha256 ? "registrado" : "ausente"}{" "}
                · integridade {original.integrity_status}
              </p>
            </>
          ) : (
            <p>Nenhum original confirmado.</p>
          )}
        </section>
      </div>
      <section className="mt-6 border-2 border-comun-black bg-comun-yellow p-5">
        <h2 className="text-xl font-black uppercase">Acoes de curadoria</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["triage", "research", "rights_review", "rejected", "archived"].map(
            (status) => (
              <form action={updateSubmissionStatus} key={status}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value={status} />
                <button className="border-2 border-comun-black bg-white px-3 py-2 font-black uppercase">
                  {status}
                </button>
              </form>
            ),
          )}
          {!submission.archive_item_id ? (
            <form action={createArchiveItemFromSubmission}>
              <input type="hidden" name="id" value={id} />
              <button className="border-2 border-comun-black bg-white px-3 py-2 font-black uppercase">
                Criar item do Acervo
              </button>
            </form>
          ) : null}
          {submission.archive_item_id && original ? (
            <form action={generateSubmissionDerivatives}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="asset_id" value={original.id} />
              <button className="border-2 border-comun-black bg-white px-3 py-2 font-black uppercase">
                Gerar derivados
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
