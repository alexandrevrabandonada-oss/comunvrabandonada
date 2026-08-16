import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { SolidarityOrganizationAccessAdminSection } from "@/components/comun-solidarity-organization-access-admin-section";
import { SolidarityOrganizationOnboardingAdminSection } from "@/components/comun-solidarity-organization-onboarding-admin-section";
import { requireComunAdmin } from "@/lib/admin-auth";
import { isComunSolidarityOrganizationGovernanceEnabled } from "@/lib/comun-solidarity-organization-governance";
import { isComunSolidarityOrganizationOnboardingEnabled } from "@/lib/comun-solidarity-organization-onboarding";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { createCommunicationMaterial, createHubAction, createHubResult } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const database = createServiceSupabaseClient();
  const empty = { data: [] };
  const [reports, pautas, actions, protocols, materials, contributions, tasks, alerts, results] = database
    ? await Promise.all([
        database.from("comun_reports").select("id,protocol,title,status,created_at").in("status", ["received", "under_review", "needs_more_info"]).order("created_at"),
        database.from("comun_pauta_spaces").select("id,slug,title,priority,public_status,responsible_internal,last_operational_update_at").neq("public_status", "archived").order("priority"),
        database.from("comun_mobilization_actions").select("id,slug,title,status,starts_at,responsible_internal").in("status", ["planning", "confirmed", "in_progress", "blocked"]).order("starts_at"),
        database.from("comun_official_protocols").select("id,comun_protocol,status,expected_response_at").in("status", ["waiting_response", "overdue", "response_received"]),
        database.from("comun_hub_communication_materials").select("id,title,status,planned_at").in("status", ["draft", "review", "approved", "scheduled"]),
        database.from("comun_pauta_contributions").select("id,contribution_type,status,created_at").eq("status", "pending"),
        database.from("comun_pauta_tasks").select("id,title,status,due_at,owner_alias,priority").in("status", ["open", "assigned", "in_progress", "blocked"]),
        database.from("comun_admin_alerts").select("id,title,severity,status").in("status", ["open", "acknowledged"]).order("severity"),
        database.from("comun_hub_results").select("id,title,result_type,occurred_at").order("occurred_at", { ascending: false }).limit(5),
      ])
    : [empty, empty, empty, empty, empty, empty, empty, empty, empty];
  const overdue = (tasks.data ?? []).filter(
    (task: any) => task.due_at && new Date(task.due_at) < new Date() && task.status !== "done",
  );
  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap justify-between gap-3">
        <div><h1 className="text-3xl font-black uppercase">Sala de Organização</h1><p>O que precisa de ação, responsável, prazo e bloqueio.</p></div>
        <div className="flex gap-2"><Link className="btn" href="/comun/admin/organizacao/entrada">Caixa de entrada</Link><Link className="btn" href="/comun/admin/organizacao/calendario">Calendário</Link></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Relatos em triagem", reports.data?.length],
          ["Pautas sem responsável", (pautas.data ?? []).filter((item: any) => !item.responsible_internal).length],
          ["Ações abertas", actions.data?.length],
          ["Protocolos aguardando", protocols.data?.length],
          ["Materiais pendentes", materials.data?.length],
          ["Contribuições pendentes", contributions.data?.length],
          ["Tarefas atrasadas", overdue.length],
          ["Alertas", alerts.data?.length],
        ].map(([label, value]) => <div className="border-2 bg-white p-4" key={String(label)}><b className="text-3xl">{value}</b><p className="text-sm font-black uppercase">{label}</p></div>)}
      </div>
      <Grid title="Pautas prioritárias" rows={(pautas.data ?? []).slice(0, 8).map((item: any) => ({ id: item.id, title: item.title, meta: `${item.priority} · ${item.public_status} · ${item.responsible_internal ?? "sem responsável"}`, href: `/comun/admin/pautas/${item.id}` }))} />
      <Grid title="Ações desta semana" rows={(actions.data ?? []).slice(0, 8).map((item: any) => ({ id: item.id, title: item.title, meta: `${item.status} · ${item.starts_at ? new Date(item.starts_at).toLocaleString("pt-BR") : "sem data"} · ${item.responsible_internal ?? "sem responsável"}`, href: "/comun/admin/organizacao/calendario" }))} />
      <Grid title="Tarefas atrasadas" rows={overdue.map((item: any) => ({ id: item.id, title: item.title, meta: `${item.priority} · ${item.owner_alias ?? "sem responsável"} · ${new Date(item.due_at).toLocaleDateString("pt-BR")}`, href: "/comun/admin/pautas" }))} />
      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        <Form title="Criar ação" action={createHubAction}><Pautas rows={pautas.data ?? []} /><Input n="title" l="Título" /><Input n="objective_public" l="Objetivo público" /><Select n="action_type" vals={["investigation", "information_request", "protocol", "meeting", "leafleting", "collective_work", "demonstration", "communication_campaign", "territorial_visit", "training", "inspection", "digital_pressure", "content_production", "community_support", "other"]} /><Select n="status" vals={["proposal", "planning", "confirmed", "in_progress", "completed", "blocked"]} /><Input n="starts_at" l="Data" type="datetime-local" /><Select n="visibility" vals={["internal", "public"]} /></Form>
        <Form title="Criar material" action={createCommunicationMaterial}><Pautas rows={pautas.data ?? []} /><Input n="title" l="Título" /><Select n="material_type" vals={["post", "carousel", "reels", "video", "whatsapp_text", "press_note", "leaflet", "poster", "presentation", "technical_document", "newsletter"]} /><Input n="objective" l="Objetivo" /><Input n="planned_at" l="Data" type="datetime-local" /></Form>
        <Form title="Registrar resultado" action={createHubResult}><Pautas rows={pautas.data ?? []} /><Input n="title" l="Título" /><Select n="result_type" vals={["achievement", "official_response", "partial_change", "promise", "work_started", "policy_changed", "problem_solved", "no_response", "setback", "learning"]} /><Input n="public_summary" l="Resumo público" /><Select n="verification_status" vals={["pending", "verified", "disputed"]} /><Select n="visibility" vals={["internal", "public"]} /></Form>
      </section>
      <Grid title="Resultados recentes" rows={(results.data ?? []).map((item: any) => ({ id: item.id, title: item.title, meta: `${item.result_type} · ${new Date(item.occurred_at).toLocaleDateString("pt-BR")}`, href: "/comun/resultados" }))} />
      {isComunSolidarityOrganizationGovernanceEnabled() ? <SolidarityOrganizationAccessAdminSection actorUserId={session.user.id} /> : null}
      {isComunSolidarityOrganizationOnboardingEnabled() && session.admin.role === "admin" ? <SolidarityOrganizationOnboardingAdminSection actorUserId={session.user.id} /> : null}
    </AdminShell>
  );
}

function Grid({ title, rows }: { title: string; rows: any[] }) {
  return <section className="mt-7"><h2 className="text-xl font-black uppercase">{title}</h2><div className="mt-3 grid gap-2">{rows.map((row) => <Link className="border-2 bg-white p-3" href={row.href} key={row.id}><b>{row.title}</b><p className="text-sm">{row.meta}</p></Link>)}{!rows.length ? <p className="border-2 p-3">Nenhuma pendência.</p> : null}</div></section>;
}

function Form({ title, action, children }: { title: string; action: any; children: React.ReactNode }) {
  return <form action={action} className="grid gap-2 border-2 bg-white p-4"><h2 className="font-black uppercase">{title}</h2>{children}<button className="btn">Salvar</button></form>;
}

function Pautas({ rows }: { rows: any[] }) {
  return <label>Pauta<select required name="pauta_id">{rows.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>;
}

function Input({ n, l, type = "text" }: { n: string; l: string; type?: string }) {
  return <label>{l}<input required name={n} type={type} /></label>;
}

function Select({ n, vals }: { n: string; vals: string[] }) {
  return <label>{n}<select name={n}>{vals.map((value) => <option key={value}>{value}</option>)}</select></label>;
}
