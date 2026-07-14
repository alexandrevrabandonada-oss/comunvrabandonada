import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { evaluateArchiveOperationalAlerts } from "@/lib/archive/worker-health";
import { updateAlert } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requireComunAdmin();
  await evaluateArchiveOperationalAlerts();
  const { data } = await createServiceSupabaseClient()!
    .from("comun_admin_alerts")
    .select("*")
    .order("last_seen_at", { ascending: false });
  return (
    <AdminShell adminEmail={s.admin.email}>
      <h1 className="text-3xl font-black">Alertas operacionais</h1>
      {data?.map((a) => (
        <article className="mt-4 border-2 bg-white p-4" key={a.id}>
          <b>
            {a.severity} · {a.title}
          </b>
          <p>{a.sanitized_message}</p>
          <p>
            {a.status} · ocorrências {a.occurrence_count}
          </p>
          {["acknowledged", "resolved", "archived"].map((x) => (
            <form className="inline" action={updateAlert} key={x}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value={x} />
              <button className="mr-3 underline">{x}</button>
            </form>
          ))}
        </article>
      ))}
    </AdminShell>
  );
}
