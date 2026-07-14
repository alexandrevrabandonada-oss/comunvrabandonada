import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { listAdminReports } from "@/lib/reports";

const workCampaignCategories = [
  ["", "Todas as categorias"],
  ["pressao-psicologica", "Pressao psicologica"],
  ["assedio-moral", "Assedio moral"],
  ["burnout", "Burnout"],
  ["atraso-salarial", "Atraso salarial"],
  ["fgts-atrasado", "FGTS atrasado"],
  ["terceirizacao", "Terceirizacao"],
  ["jornada-abusiva", "Jornada abusiva"],
  ["ferias-impostas", "Ferias impostas"],
  ["risco-de-acidente", "Risco de acidente"],
  ["insalubridade-periculosidade", "Insalubridade/periculosidade"],
  ["medo-de-denunciar", "Medo de denunciar"],
  ["retaliacao", "Retaliacao"],
] as const;

export default async function AdminPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdmin();

  const createdFrom = searchParams.data_de ? new Date(`${searchParams.data_de}T00:00:00`) : null;
  const createdTo = searchParams.data_ate ? new Date(`${searchParams.data_ate}T23:59:59.999`) : null;
  const [reports, communities, issues] = await Promise.all([listAdminReports(), listCommunities(), listIssues()]);
  const filtered = reports.filter((report) => {
    if (searchParams.status && report.status !== searchParams.status) return false;
    if (searchParams.comunidade && report.community_slug !== searchParams.comunidade) return false;
    if (searchParams.pauta && report.issue_slug !== searchParams.pauta) return false;
    if (searchParams.categoria && extractCampaignCategory(report.title) !== searchParams.categoria) return false;
    if (searchParams.risco && report.risk_level !== searchParams.risco) return false;
    if (searchParams.publicacao === "sim" && !report.can_publish_sanitized) return false;
    if (searchParams.publicacao === "nao" && report.can_publish_sanitized) return false;
    if (searchParams.contato === "sim" && !report.accepts_contact) return false;
    if (searchParams.contato === "nao" && report.accepts_contact) return false;
    if (searchParams.rapido === "sim" && !report.quick_report) return false;
    if (searchParams.rapido === "nao" && report.quick_report) return false;
    if (searchParams.foto === "sim" && !report.has_attachments) return false;
    if (searchParams.foto === "nao" && report.has_attachments) return false;
    if (searchParams.anexo_pendente === "sim" && !report.pending_attachment_count) return false;
    if (searchParams.anexo_pendente === "nao" && report.pending_attachment_count) return false;
    const createdAt = new Date(report.created_at);
    if (createdFrom && createdAt < createdFrom) return false;
    if (createdTo && createdAt > createdTo) return false;
    return true;
  });

  const stats = [
    ["Relatos novos", reports.filter((r) => r.status === "received").length],
    ["Com autorizacao", reports.filter((r) => r.can_publish_sanitized).length],
    ["Pedem contato", reports.filter((r) => r.accepts_contact).length],
    ["Relatos rapidos", reports.filter((r) => r.quick_report).length],
    ["Com foto", reports.filter((r) => r.has_attachments).length],
    ["Fotos pendentes", reports.reduce((total, report) => total + (report.pending_attachment_count ?? 0), 0)],
    ["Alto risco", reports.filter((r) => ["high", "critical"].includes(r.risk_level)).length],
    ["Publicados", reports.filter((r) => r.status === "published").length],
  ];

  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Caixa de entrada de relatos</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Link
          href="/comun/admin?comunidade=trabalho&pauta=trabalho-burnout-volta-redonda"
          className="border-2 border-comun-black bg-comun-yellow p-4"
        >
          <p className="text-xs font-black uppercase text-comun-black/70">Filtro rapido</p>
          <p className="mt-2 text-xl font-black uppercase">Campanha: Trabalho e Burnout</p>
          <p className="mt-2 text-sm font-medium text-comun-black/80">
            Abrir direto os relatos ligados a Trabalho e Burnout em Volta Redonda.
          </p>
        </Link>
        <Link
          href="/comun/pautas/trabalho-burnout-volta-redonda"
          className="border-2 border-comun-yellow bg-comun-black p-4 text-comun-paper"
        >
          <p className="text-xs font-black uppercase text-comun-paper/70">Link de campanha</p>
          <p className="mt-2 text-xl font-black uppercase text-comun-yellow">Abrir pauta publica piloto</p>
          <p className="mt-2 text-sm font-medium text-comun-paper/80">
            Ver a pagina compartilhavel usada no lancamento do primeiro ciclo real do COMUN.
          </p>
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
        {stats.map(([label, value]) => (
          <div key={label} className="border-2 border-comun-black bg-white p-4">
            <p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <form className="mt-6 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-11">
        <Select
          name="status"
          label="Status"
          values={["", "received", "under_review", "needs_more_info", "sanitized", "published", "archived"]}
          defaultValue={searchParams.status}
        />
        <label className="grid gap-1 text-sm font-black uppercase">
          Tema
          <select name="comunidade" defaultValue={searchParams.comunidade ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {communities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black uppercase">
          Pauta
          <select name="pauta" defaultValue={searchParams.pauta ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {issues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black uppercase">
          Categoria da campanha
          <select name="categoria" defaultValue={searchParams.categoria ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            {workCampaignCategories.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
        </label>
        <Select name="risco" label="Risco" values={["", "unknown", "low", "medium", "high", "critical"]} defaultValue={searchParams.risco} />
        <Select name="publicacao" label="Autorizacao" values={["", "sim", "nao"]} defaultValue={searchParams.publicacao} />
        <Select name="contato" label="Aceita contato" values={["", "sim", "nao"]} defaultValue={searchParams.contato} />
        <Select name="rapido" label="Relato rapido" values={["", "sim", "nao"]} defaultValue={searchParams.rapido} />
        <Select name="foto" label="Foto" values={["", "sim", "nao"]} defaultValue={searchParams.foto} />
        <Select name="anexo_pendente" label="Anexo pendente" values={["", "sim", "nao"]} defaultValue={searchParams.anexo_pendente} />
        <DateInput name="data_de" label="Data de" defaultValue={searchParams.data_de} />
        <DateInput name="data_ate" label="Data ate" defaultValue={searchParams.data_ate} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-11">Filtrar</button>
      </form>

      <div className="mt-6 grid gap-3">
        {filtered.map((report) => (
          <Link key={report.id} href={`/comun/admin/relatos/${report.id}`} className="grid gap-2 border-2 border-comun-black bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-center">
            <div><p className="text-xs font-black uppercase text-comun-asphalt/60">Protocolo</p><p className="font-black">{report.protocol}</p></div>
            <div>
              <p className="text-xs font-black uppercase text-comun-asphalt/60">Tema</p>
              <p>{report.community_slug}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {report.quick_report ? <SmallBadge>Relato rapido</SmallBadge> : null}
                {report.has_attachments ? <SmallBadge>Com foto</SmallBadge> : null}
                {report.pending_attachment_count ? <SmallBadge>Foto pendente</SmallBadge> : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-comun-asphalt/60">Status/risco</p>
              <p>{report.status} / {report.risk_level}</p>
              {extractCampaignCategory(report.title) ? (
                <p className="text-xs text-comun-asphalt/70">{formatCampaignCategory(extractCampaignCategory(report.title)!)}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-black uppercase text-comun-asphalt/60">Autorizacao/data</p>
              <p>{report.can_publish_sanitized ? "Publicavel" : "Nao publicavel"} / {report.accepts_contact ? "Aceita contato" : "Sem contato"}</p>
              {report.latitude && report.longitude ? (
                <p className="text-xs text-comun-asphalt/70">Local capturado internamente</p>
              ) : null}
              <p className="text-xs text-comun-asphalt/70">{formatDate(report.created_at)}</p>
            </div>
            <span className="min-h-11 bg-comun-black px-4 py-3 text-center text-sm font-black uppercase text-comun-yellow">Revisar</span>
          </Link>
        ))}
        {!filtered.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhum relato encontrado. Se o Supabase nao estiver configurado, a lista fica vazia.</p> : null}
      </div>
    </AdminShell>
  );
}

function SmallBadge({ children }: { children: ReactNode }) {
  return <span className="border border-comun-black bg-comun-yellow px-2 py-0.5 text-[10px] font-black uppercase">{children}</span>;
}

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className="min-h-11 border-2 border-comun-black px-2">
        {values.map((value) => <option key={value} value={value}>{value || "Todos"}</option>)}
      </select>
    </label>
  );
}

function DateInput({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <input type="date" name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-2" />
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatCampaignCategory(value: string) {
  return workCampaignCategories.find(([key]) => key === value)?.[1] ?? value;
}

function extractCampaignCategory(title: string | null) {
  if (!title) return null;

  const patterns: Array<[string, string]> = [
    ["[Pressao psicologica]", "pressao-psicologica"],
    ["[Assedio moral]", "assedio-moral"],
    ["[Burnout]", "burnout"],
    ["[Atraso salarial]", "atraso-salarial"],
    ["[FGTS atrasado]", "fgts-atrasado"],
    ["[Terceirizacao]", "terceirizacao"],
    ["[Jornada abusiva]", "jornada-abusiva"],
    ["[Ferias impostas]", "ferias-impostas"],
    ["[Risco de acidente]", "risco-de-acidente"],
    ["[Insalubridade/periculosidade]", "insalubridade-periculosidade"],
    ["[Medo de denunciar]", "medo-de-denunciar"],
    ["[Retaliacao]", "retaliacao"],
  ];

  return patterns.find(([prefix]) => title.startsWith(prefix))?.[1] ?? null;
}
