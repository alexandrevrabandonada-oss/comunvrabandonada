import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
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
      "id, status, title_suggestion, city, neighborhood, approximate_date, source_name, permission_confirmed, contributor_credit_preference, risk_level, contributor_contact_private, created_at",
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
        {(data ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/comun/admin/acervo/contribuicoes/${s.id}`}
            className="border-2 border-comun-black bg-white p-4"
          >
            <p className="font-black uppercase">
              ACERVO-{s.id.slice(0, 8)} · {s.status} · risco {s.risk_level}
            </p>
            <h2 className="mt-1 text-xl font-black">{s.title_suggestion}</h2>
            <p>
              {[s.city, s.neighborhood, s.approximate_date]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-sm">
              Fonte: {s.source_name} · Direitos:{" "}
              {s.permission_confirmed ? "declarados" : "pendentes"} · Contato:{" "}
              {s.contributor_contact_private ? "disponivel" : "nao informado"}
            </p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
