import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { cancelJob, processQueueNow, retryJob } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  const { data: jobs } = await db!
    .from("comun_archive_processing_jobs")
    .select(
      "id,status,job_type,archive_item_id,archive_asset_id,priority,attempt_count,max_attempts,available_at,completed_at,last_error_code,last_error_summary,result_summary,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = jobs ?? [],
    count = (s: string) => rows.filter((j) => j.status === s).length,
    done = rows.filter((j) => j.status === "completed"),
    avg = done.length
      ? Math.round(
          done.reduce(
            (n, j) =>
              n + Number((j.result_summary as any)?.metrics?.duration_ms ?? 0),
            0,
          ) / done.length,
        )
      : 0;
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">
        Processamento fotográfico
      </h1>
      <p className="mt-2">
        Fila persistida; derivados permanecem pendentes de revisão editorial.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          "queued",
          "processing",
          "retry_scheduled",
          "completed",
          "dead_letter",
        ].map((s) => (
          <div className="border-2 bg-white p-3" key={s}>
            <b>{s}</b>
            <p className="text-2xl">{count(s)}</p>
          </div>
        ))}
        <div className="border-2 bg-white p-3">
          <b>Média</b>
          <p>{avg} ms</p>
        </div>
      </div>
      <form action={processQueueNow}>
        <button className="mt-5 border-2 bg-comun-yellow p-3 font-black">
          Processar fila agora
        </button>
      </form>
      <div className="mt-6 space-y-3">
        {rows.map((j) => (
          <article className="border-2 bg-white p-4" key={j.id}>
            <Link
              className="font-black underline"
              href={`/comun/admin/acervo/processamento/${j.id}`}
            >
              {j.id.slice(0, 8)} · {j.status}
            </Link>
            <p>
              Tentativas: {j.attempt_count}/{j.max_attempts} · prioridade{" "}
              {j.priority}
            </p>
            {j.last_error_code ? (
              <p className="text-comun-red">
                {j.last_error_code}: {j.last_error_summary}
              </p>
            ) : null}
            {["dead_letter", "failed"].includes(j.status) ? (
              <form action={retryJob}>
                <input type="hidden" name="id" value={j.id} />
                <button className="underline">Tentar novamente</button>
              </form>
            ) : null}
            {["queued", "retry_scheduled", "processing"].includes(j.status) ? (
              <form action={cancelJob}>
                <input type="hidden" name="id" value={j.id} />
                <button className="underline">Cancelar</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
