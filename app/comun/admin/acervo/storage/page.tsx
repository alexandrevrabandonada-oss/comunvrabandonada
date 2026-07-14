import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { mediaStorageConfiguration } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { runArchiveStorageHealthcheck } from "./actions";
export const dynamic = "force-dynamic";
export default async function ArchiveStoragePage() {
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  const configuration = mediaStorageConfiguration();
  const [{ data: assets }, { data: lastEvent }] = db
    ? await Promise.all([
        db
          .from("comun_archive_assets")
          .select(
            "bucket_scope, mime_type, size_bytes, checksum_sha256, review_status",
          ),
        db
          .from("comun_admin_audit_log")
          .select("action, metadata, created_at")
          .in("action", [
            "archive_storage_healthcheck_passed",
            "archive_storage_healthcheck_failed",
          ])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const rows = assets ?? [];
  const total = (scope?: string) =>
    rows
      .filter((row) => !scope || row.bucket_scope === scope)
      .reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
  const byMime = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const mime = row.mime_type ?? "unknown";
      acc[mime] = (acc[mime] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Storage do Acervo</h1>
      <p className="mt-2 text-sm">
        Health check sanitizado e estimativa baseada nos registros do banco.
      </p>
      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <Status label="Provider" value="R2 / API S3" ok />
        <Status
          label="Configuracao server-only"
          value={
            configuration.configured
              ? "Completa"
              : `Pendente: ${configuration.missing.join(", ")}`
          }
          ok={configuration.configured}
        />
        <Status
          label="Dominio publico"
          value={
            configuration.publicBaseUrlConfigured ? "Configurado" : "Pendente"
          }
          ok={configuration.publicBaseUrlConfigured}
        />
        <Status
          label="Ambiente"
          value={process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"}
          ok
        />
        <Status
          label="Ultima validacao"
          value={
            lastEvent
              ? `${lastEvent.action} em ${new Date(lastEvent.created_at).toLocaleString("pt-BR")}`
              : "Ainda nao executada"
          }
          ok={lastEvent?.action === "archive_storage_healthcheck_passed"}
        />
      </section>
      {session.admin.role === "admin" ? (
        <form action={runArchiveStorageHealthcheck} className="mt-5">
          <button
            disabled={!configuration.configured}
            className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase disabled:cursor-not-allowed disabled:opacity-50"
          >
            Testar escrita, leitura e exclusao
          </button>
        </form>
      ) : null}
      <section className="mt-8">
        <h2 className="text-xl font-black uppercase">Uso estimado</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Metric label="Assets" value={rows.length} />
          <Metric label="Bytes privados" value={total("private_original")} />
          <Metric label="Bytes publicos" value={total("public_safe")} />
          <Metric
            label="Sem checksum"
            value={rows.filter((row) => !row.checksum_sha256).length}
          />
          <Metric
            label="Pendentes"
            value={rows.filter((row) => row.review_status === "pending").length}
          />
          <Metric label="Bytes totais" value={total()} />
        </div>
        <div className="mt-4 border-2 border-comun-black bg-white p-4">
          <h3 className="font-black uppercase">Quantidade por MIME</h3>
          {byMime.map(([mime, count]) => (
            <p key={mime} className="mt-1 text-sm">
              {mime}: {count}
            </p>
          ))}
          {!byMime.length ? (
            <p className="mt-2 text-sm">Nenhum asset registrado.</p>
          ) : null}
        </div>
        <p className="mt-3 text-xs">
          Estimativa do banco; nao substitui as metricas do provider.
        </p>
      </section>
    </AdminShell>
  );
}
function Status({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase">{label}</p>
      <p
        className={`mt-2 font-bold ${ok ? "text-comun-green" : "text-comun-red"}`}
      >
        {value}
      </p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-2xl font-black">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
