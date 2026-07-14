import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { moderateArchiveSuggestion } from "./actions";
export const dynamic = "force-dynamic";
export default async function SuggestionsPage() {
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  const { data } = db
    ? await db
        .from("comun_archive_item_suggestions")
        .select(
          "id, archive_item_id, suggestion_type, suggestion_text, contributor_alias, contact_private, source_reference, status, risk_level, moderator_notes, created_at, comun_archive_items(title, slug)",
        )
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Sugestoes de memoria</h1>
      <p className="mt-2">
        Aprovacao registra informacao de pesquisa; nunca altera a publicacao
        automaticamente.
      </p>
      <div className="mt-6 grid gap-4">
        {(data ?? []).map((s) => (
          <article
            key={s.id}
            className="border-2 border-comun-black bg-white p-5"
          >
            <p className="font-black uppercase">
              {s.suggestion_type} · {s.status} · risco {s.risk_level}
            </p>
            <p className="mt-2">{s.suggestion_text}</p>
            <p className="mt-2 text-sm">
              Fonte: {s.source_reference || "nao indicada"} · alias:{" "}
              {s.contributor_alias || "anonimo"} · contato privado:{" "}
              {s.contact_private ? "disponivel" : "nao informado"}
            </p>
            <form
              action={moderateArchiveSuggestion}
              className="mt-3 grid gap-2 sm:grid-cols-4"
            >
              <input type="hidden" name="id" value={s.id} />
              <input
                name="moderator_notes"
                defaultValue={s.moderator_notes || ""}
                placeholder="Notas internas"
                className="border-2 border-comun-black p-2 sm:col-span-4"
              />
              {["research", "approved", "rejected", "archived"].map(
                (status) => (
                  <button
                    key={status}
                    name="status"
                    value={status}
                    className="border-2 border-comun-black p-2 font-black uppercase"
                  >
                    {status}
                  </button>
                ),
              )}
            </form>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
