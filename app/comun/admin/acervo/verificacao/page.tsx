import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { mediaStorageConfiguration } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { runArchiveProductionVerificationAction } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  const { data: last } = db
    ? await db
        .from("comun_system_verification_runs")
        .select(
          "id,status,started_at,finished_at,result_summary,sanitized_error",
        )
        .in("verification_type", [
          "archive_production",
          "archive_queue_production",
        ])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const config = mediaStorageConfiguration();
  const summary = last?.result_summary as {
    steps?: Array<{ name: string; passed: boolean; durationMs: number }>;
    cleanup?: boolean;
    durationMs?: number;
  } | null;
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Verificação do Acervo</h1>
      <p className="mt-2">
        Teste descartável server-side. Nenhum segredo é enviado ao navegador.
      </p>
      <div className="mt-6 border-2 border-comun-black bg-white p-4">
        <p>
          <b>Storage:</b> {config.configured ? "configurado" : "incompleto"}
        </p>
        <p>
          <b>Ambiente:</b> {process.env.VERCEL_ENV ?? process.env.NODE_ENV}
        </p>
        <p>
          <b>Última execução:</b>{" "}
          {last
            ? `${last.status} — ${new Date(last.started_at).toLocaleString("pt-BR")}`
            : "nenhuma"}
        </p>
        <p>
          <b>Duração:</b> {summary?.durationMs ?? 0} ms
        </p>
        <p>
          <b>Cleanup:</b> {summary?.cleanup ? "concluído" : "não confirmado"}
        </p>
        {summary?.steps?.map((s) => (
          <p key={s.name}>
            {s.passed ? "✓" : "✗"} {s.name} ({s.durationMs} ms)
          </p>
        ))}
      </div>
      {session.admin.role === "admin" ? (
        <form
          action={runArchiveProductionVerificationAction}
          className="mt-6 border-2 border-comun-black bg-white p-4"
        >
          <label className="flex gap-3">
            <input
              type="checkbox"
              name="confirmation"
              value="confirmed"
              required
            />
            Entendo que será criada e removida uma fixture técnica no storage de
            produção.
          </label>
          <button className="mt-4 min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">
            Executar verificação descartável
          </button>
        </form>
      ) : null}
    </AdminShell>
  );
}
