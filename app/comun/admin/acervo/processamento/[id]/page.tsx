import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireComunAdmin(),
    { id } = await params,
    db = createServiceSupabaseClient();
  const [{ data: job }, { data: attempts }, { data: events }] =
    await Promise.all([
      db!
        .from("comun_archive_processing_jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      db!
        .from("comun_archive_processing_attempts")
        .select(
          "attempt_number,status,worker_id,started_at,finished_at,duration_ms,error_code,error_summary,metrics",
        )
        .eq("job_id", id)
        .order("attempt_number"),
      db!
        .from("comun_archive_processing_events")
        .select("event_type,sanitized_metadata,created_at")
        .eq("job_id", id)
        .order("created_at"),
    ]);
  if (!job) notFound();
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black">Job {id.slice(0, 8)}</h1>
      <p>
        Status {job.status} · receita v1 · tentativas {job.attempt_count}/
        {job.max_attempts}
      </p>
      <h2 className="mt-6 text-xl font-black">Tentativas</h2>
      {attempts?.map((a) => (
        <pre
          className="mt-2 overflow-auto border-2 bg-white p-3 text-xs"
          key={a.attempt_number}
        >
          {JSON.stringify(a, null, 2)}
        </pre>
      ))}
      <h2 className="mt-6 text-xl font-black">Eventos</h2>
      {events?.map((e, i) => (
        <p className="mt-2" key={i}>
          {e.created_at} · {e.event_type}
        </p>
      ))}
    </AdminShell>
  );
}
