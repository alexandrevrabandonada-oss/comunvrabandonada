import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listCommunities } from "@/lib/comun-data";
import { listAdminReports } from "@/lib/reports";

export default async function AdminPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await requireComunAdmin();

  const [reports, communities] = await Promise.all([listAdminReports(), listCommunities()]);
  const filtered = reports.filter((report) => {
    if (searchParams.status && report.status !== searchParams.status) return false;
    if (searchParams.comunidade && report.community_slug !== searchParams.comunidade) return false;
    if (searchParams.risco && report.risk_level !== searchParams.risco) return false;
    if (searchParams.publicacao === "sim" && !report.can_publish_sanitized) return false;
    if (searchParams.contato === "sim" && !report.accepts_contact) return false;
    return true;
  });

  const stats = [
    ["Relatos novos", reports.filter((r) => r.status === "received").length],
    ["Com autorizacao", reports.filter((r) => r.can_publish_sanitized).length],
    ["Pedem contato", reports.filter((r) => r.accepts_contact).length],
    ["Alto risco", reports.filter((r) => ["high", "critical"].includes(r.risk_level)).length],
    ["Publicados", reports.filter((r) => r.status === "published").length],
  ];

  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Caixa de entrada de relatos</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="border-2 border-comun-black bg-white p-4">
            <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <form className="mt-6 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-5">
        <Select name="status" label="Status" values={["", "received", "under_review", "needs_more_info", "sanitized", "published", "archived"]} />
        <label className="grid gap-1 text-sm font-black uppercase">
          Comunidade
          <select name="comunidade" className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {communities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <Select name="risco" label="Risco" values={["", "unknown", "low", "medium", "high", "critical"]} />
        <Select name="publicacao" label="Publicacao" values={["", "sim"]} />
        <Select name="contato" label="Contato" values={["", "sim"]} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-5">Filtrar</button>
      </form>

      <div className="mt-6 grid gap-3">
        {filtered.map((report) => (
          <Link key={report.id} href={`/comun/admin/relatos/${report.id}`} className="grid gap-2 border-2 border-comun-black bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
            <div><p className="text-xs font-black uppercase text-comun-asphalt/60">Protocolo</p><p className="font-black">{report.protocol}</p></div>
            <div><p className="text-xs font-black uppercase text-comun-asphalt/60">Tema</p><p>{report.community_slug}</p></div>
            <div><p className="text-xs font-black uppercase text-comun-asphalt/60">Status/risco</p><p>{report.status} / {report.risk_level}</p></div>
            <span className="min-h-11 bg-comun-black px-4 py-3 text-center text-sm font-black uppercase text-comun-yellow">Revisar</span>
          </Link>
        ))}
        {!filtered.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhum relato encontrado. Se o Supabase nao estiver configurado, a lista fica vazia.</p> : null}
      </div>
    </AdminShell>
  );
}

function Select({ name, label, values }: { name: string; label: string; values: string[] }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select name={name} className="min-h-11 border-2 border-comun-black px-2">
        {values.map((value) => <option key={value} value={value}>{value || "Todos"}</option>)}
      </select>
    </label>
  );
}
