import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { resolveArchiveSubmissionReadiness } from "@/lib/archive/cultural-curation-readiness";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function ArchiveSubmissionsPage(props: {
  searchParams: Promise<{ status?: string; city?: string; risk?: string }>;
}) {
  const session = await requireComunAdmin();
  const filters = await props.searchParams;
  const db = createServiceSupabaseClient();
  let query = db
    ?.from("comun_archive_submissions")
    .select(
      "id, submission_type, status, title_suggestion, description_suggestion, city, neighborhood, approximate_date, source_name, source_story, relationship_to_material, rights_state, publication_scope, reuse_permission, license_code, risk_level, archive_item_id, created_at, comun_archive_submission_assets(upload_status,comun_archive_assets(integrity_status,review_status))",
    )
    .order("created_at", { ascending: true })
    .limit(100);
  if (filters.status) query = query?.eq("status", filters.status);
  if (filters.city) query = query?.eq("city", filters.city);
  if (filters.risk) query = query?.eq("risk_level", filters.risk);
  const { data } = query ? await query : { data: [] };
  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-black uppercase text-comun-rust">Acervo Vivo</p>
          <h1 className="text-3xl font-black uppercase">
            Contribuicoes fotograficas
          </h1>
        </div>
        <Link
          href="/comun/admin/acervo/sugestoes"
          className="font-black uppercase underline"
        >
          Sugestoes de memoria
        </Link>
      </div>
      <form className="mt-6 grid gap-2 border-2 border-comun-black bg-white p-4 sm:grid-cols-3">
        <select name="status" defaultValue={filters.status || ""}>
          <option value="">Todos os status</option>
          {[
            "submitted",
            "triage",
            "research",
            "rights_review",
            "derivative_pending",
            "ready_for_editorial_review",
            "rejected",
            "archived",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input name="city" defaultValue={filters.city} placeholder="Cidade" />
        <select name="risk" defaultValue={filters.risk || ""}>
          <option value="">Todos os riscos</option>
          {["normal", "attention", "high"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="bg-comun-yellow p-2 font-black uppercase sm:col-span-3">
          Filtrar
        </button>
      </form>
      <div className="mt-6 grid gap-3">
        {(data ?? []).map((s: any) => {
          const confirmedOriginal = (s.comun_archive_submission_assets ?? []).some(
            (link: any) => {
              const asset = Array.isArray(link.comun_archive_assets)
                ? link.comun_archive_assets[0]
                : link.comun_archive_assets;
              return link.upload_status === "confirmed" && asset?.integrity_status === "verified" && asset?.review_status === "approved";
            },
          );
          const readiness = resolveArchiveSubmissionReadiness(s, {
            confirmedOriginal,
            derivativesReady: !s.archive_item_id,
          });
          return (
            <Link
              key={s.id}
              href={`/comun/admin/acervo/contribuicoes/${s.id}`}
              className="border-2 border-comun-black bg-white p-4"
            >
              <p className="font-black uppercase">
                ACERVO-{s.id.slice(0, 8)} · fotografia/documento · {s.status} · risco {s.risk_level}
              </p>
              <h2 className="mt-1 text-xl font-black">{s.title_suggestion}</h2>
              <p>
                {[s.city, s.neighborhood, s.approximate_date]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-sm font-bold uppercase">
                {readiness.readyForEditorialReview ? "Pronto para revisão editorial" : "Pendente"}
              </p>
              <p className="text-sm">
                {readiness.readyForEditorialReview
                  ? "Próxima ação: solicitar revisão editorial."
                  : `Próxima ação: ${readiness.requiredActions[0]?.replaceAll("_", " ") ?? "revisar contribuição"}.`}
              </p>
              {readiness.blockers.length ? (
                <p className="mt-1 text-sm text-comun-rust">
                  Bloqueios: {readiness.blockers.slice(0, 3).join(" · ")}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
