import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { getProtocolLookupObservability } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export default async function AdminObservabilityPage() {
  const session = await requireComunAdmin({ roles: ["admin"] });
  const { totals, events } = await getProtocolLookupObservability();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Observabilidade</h1>
          <p className="mt-2 max-w-3xl text-sm text-comun-asphalt/80">
            Consultas publicas por protocolo nas ultimas 24 horas. IP e user-agent ficam somente em hash no banco.
          </p>
        </div>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total" value={totals.total} />
        <MetricCard label="Invalidos" value={totals.invalid} />
        <MetricCard label="Nao encontrados" value={totals.notFound} />
        <MetricCard label="Encontrados" value={totals.found} />
        <MetricCard label="Limitados" value={totals.rateLimited} />
      </section>

      <section className="mt-6 overflow-x-auto border-2 border-comun-black bg-white">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-comun-black text-comun-paper">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Resultado</th>
              <th className="p-3">Rota</th>
              <th className="p-3">Protocolo</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t-2 border-comun-black">
                <td className="p-3">{new Date(event.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3 font-black">{event.result_type}</td>
                <td className="p-3">{event.route ?? "-"}</td>
                <td className="p-3 font-mono text-xs">{maskProtocol(event.normalized_protocol)}</td>
                <td className="p-3 font-mono text-xs">{JSON.stringify(event.metadata ?? {})}</td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td colSpan={5} className="p-4">Nenhum evento registrado nas ultimas 24 horas.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function maskProtocol(protocol: string | null) {
  if (!protocol) return "-";
  if (protocol.length <= 8) return "********";
  return `${protocol.slice(0, 6)}...${protocol.slice(-4)}`;
}
