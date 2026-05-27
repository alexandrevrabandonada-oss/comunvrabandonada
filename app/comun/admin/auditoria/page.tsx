import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listComunAdminAuditLog } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await requireComunAdmin({ roles: ["admin"] });
  const events = await listComunAdminAuditLog();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Auditoria</h1>
      <div className="mt-5 overflow-x-auto border-2 border-comun-black bg-white">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-comun-black text-comun-paper">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Acao</th>
              <th className="p-3">Alvo</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t-2 border-comun-black">
                <td className="p-3">{new Date(event.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3">{event.admin_email ?? "-"}</td>
                <td className="p-3 font-black">{event.action}</td>
                <td className="p-3">{event.target_type ?? "-"} {event.target_id ?? ""}</td>
                <td className="p-3 font-mono text-xs">{JSON.stringify(event.metadata ?? {})}</td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td colSpan={5} className="p-4">Nenhum evento registrado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
