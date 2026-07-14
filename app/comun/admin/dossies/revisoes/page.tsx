import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { listAdminPautaDossierReviewQueue } from "@/lib/pauta-dossiers";

const filters = [
  ["", "Todos"],
  ["pending_factual", "Pendente factual"],
  ["pending_editorial", "Pendente editorial"],
  ["factual_without_editorial", "Factual ok, falta editorial"],
  ["editorial_without_factual", "Editorial ok, falta factual"],
  ["blocked_same_reviewer", "Mesmo revisor"],
  ["changes_requested", "Ajustes solicitados"],
  ["rejected", "Rejeitados"],
  ["ready_to_publish", "Prontos para publicar"],
] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDossierReviewQueuePage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdmin();
  const activeFilter = String(searchParams.filtro ?? "");
  const activeResponsible = String(searchParams.responsavel ?? "");
  const activePriority = String(searchParams.prioridade ?? "");
  const onlyOverdue = searchParams.vencidos === "1";
  const { items, summary } = await listAdminPautaDossierReviewQueue({
    queueFilter: activeFilter,
    responsible: activeResponsible,
    priority: activePriority,
    overdue: onlyOverdue,
  });
  await logComunAdminAction({
    session,
    action: "review_digest_viewed",
    targetType: "pauta_dossier_review_queue",
    metadata: { filtered_count: items.length },
  });

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Dossies por pauta</p>
          <h1 className="text-3xl font-black uppercase">Fila de revisoes</h1>
        </div>
        <Link href="/comun/admin/dossies" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Todos os dossies</Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-6">
        <Metric label="Pendente factual" value={summary.pendingFactual} />
        <Metric label="Pendente editorial" value={summary.pendingEditorial} />
        <Metric label="Bloqueados" value={summary.blocked} />
        <Metric label="Prontos" value={summary.readyToPublish} />
        <Metric label="Vence hoje" value={summary.dueToday} />
        <Metric label="Vencidos" value={summary.overdue} />
      </section>

      <section className="mt-5 border-2 border-comun-black bg-white p-4">
        <h2 className="text-xl font-black uppercase">Resumo operacional</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <DigestItem label="Vencidos" value={summary.overdue} href="/comun/admin/dossies/revisoes?vencidos=1" />
          <DigestItem label="Vencem hoje" value={summary.dueToday} href="/comun/admin/dossies/revisoes" />
          <DigestItem label="Aguardando factual" value={summary.pendingFactual} href="/comun/admin/dossies/revisoes?filtro=pending_factual" />
          <DigestItem label="Aguardando editorial" value={summary.pendingEditorial} href="/comun/admin/dossies/revisoes?filtro=pending_editorial" />
          <DigestItem label="Prontos" value={summary.readyToPublish} href="/comun/admin/dossies/revisoes?filtro=ready_to_publish" />
          <DigestItem label="Bloqueados" value={summary.blocked} href="/comun/admin/dossies/revisoes?filtro=blocked_same_reviewer" />
          <DigestItem label="Ajustes" value={items.filter((item) => item.queue_tags.includes("changes_requested")).length} href="/comun/admin/dossies/revisoes?filtro=changes_requested" />
        </div>
      </section>

      <form className="mt-5 flex flex-wrap items-end gap-2 border-2 border-comun-black bg-white p-3">
        <label className="grid gap-1 text-xs font-black uppercase">Filtro<select name="filtro" defaultValue={activeFilter} className="min-h-10 border-2 border-comun-black px-2">{filters.map(([value, label]) => <option key={value || "todos"} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-black uppercase">Responsavel<input name="responsavel" defaultValue={activeResponsible} className="min-h-10 border-2 border-comun-black px-2" placeholder="Nome" /></label>
        <label className="grid gap-1 text-xs font-black uppercase">Prioridade<select name="prioridade" defaultValue={activePriority} className="min-h-10 border-2 border-comun-black px-2"><option value="">Todas</option><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
        <label className="flex min-h-10 items-center gap-2 border-2 border-comun-black px-3 text-xs font-black uppercase"><input type="checkbox" name="vencidos" value="1" defaultChecked={onlyOverdue} /> Vencidos</label>
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Aplicar</button>
        <Link href="/comun/admin/dossies/revisoes" className="inline-flex min-h-10 items-center border-2 border-comun-black px-3 text-xs font-black uppercase">Limpar</Link>
      </form>

      <section className="mt-5 overflow-x-auto border-2 border-comun-black bg-white">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-comun-black text-comun-paper">
            <tr>
              <Th>Dossie</Th>
              <Th>Pauta</Th>
              <Th>Prioridade</Th>
              <Th>Prazo</Th>
              <Th>Status</Th>
              <Th>Idade</Th>
              <Th>Ultima revisao</Th>
              <Th>Etapa pendente</Th>
              <Th>Responsavel</Th>
              <Th>Acao</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-t-2 border-comun-black align-top ${item.due_state.isOverdue ? "bg-red-50" : item.due_state.isDueToday ? "bg-yellow-50" : ""}`}>
                <Td>
                  <p className="font-black uppercase">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-comun-asphalt/55">{item.public_slug ?? item.slug}</p>
                </Td>
                <Td>{item.pauta?.title ?? "Pauta removida"}</Td>
                <Td><PriorityBadge value={item.review_priority} /></Td>
                <Td>
                  {item.review_due_at ? (
                    <>
                      <p className="font-bold">{new Date(item.review_due_at).toLocaleDateString("pt-BR")}</p>
                      {item.due_state.isOverdue ? <p className="mt-1 text-xs font-black uppercase text-red-700">Vencido</p> : null}
                      {item.due_state.isDueToday ? <p className="mt-1 text-xs font-black uppercase text-yellow-700">Vence hoje</p> : null}
                      {!item.due_state.isOverdue && !item.due_state.isDueToday && item.due_state.daysUntilDue !== null ? <p className="mt-1 text-xs text-comun-asphalt/60">{item.due_state.daysUntilDue} dia(s)</p> : null}
                    </>
                  ) : "-"}
                </Td>
                <Td>
                  <p className="font-black uppercase">{item.review_status}</p>
                  <p className="mt-1 text-xs text-comun-asphalt/60">{item.queue_tags.join(", ") || "-"}</p>
                </Td>
                <Td>{item.age_days} dia(s)</Td>
                <Td>
                  {item.latest_review ? (
                    <>
                      <p className="font-bold">{item.latest_review.review_stage} / {item.latest_review.decision}</p>
                      <p className="text-xs text-comun-asphalt/60">{new Date(item.latest_review.created_at).toLocaleString("pt-BR")}</p>
                    </>
                  ) : "Sem revisao"}
                </Td>
                <Td>{item.pending_stage}</Td>
                <Td>
                  <p>Factual: {item.factual_reviewer_assigned || item.review_state.factualReviewer || "-"} {item.factual_reviewer_assigned && !item.factual_reviewer_assigned_user_id ? <span className="text-xs font-black text-red-700">(legado)</span> : null}</p>
                  <p>Editorial: {item.editorial_reviewer_assigned || item.review_state.editorialReviewer || "-"} {item.editorial_reviewer_assigned && !item.editorial_reviewer_assigned_user_id ? <span className="text-xs font-black text-red-700">(legado)</span> : null}</p>
                </Td>
                <Td><Link href={`/comun/admin/dossies/${item.id}`} className="inline-flex min-h-9 items-center border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Abrir</Link></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length ? <p className="border-t-2 border-comun-black p-4 text-sm text-comun-asphalt/70">Nenhum dossie encontrado para este filtro.</p> : null}
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-2 border-comun-black bg-white p-4"><p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function DigestItem({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="border-2 border-comun-black bg-comun-paper p-3"><p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Link>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="p-3 text-xs font-black uppercase">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="p-3">{children}</td>;
}

function PriorityBadge({ value }: { value: string }) {
  const label = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" }[value] ?? value;
  const className =
    value === "urgent"
      ? "bg-red-700 text-white"
      : value === "high"
        ? "bg-comun-yellow text-comun-black"
        : value === "low"
          ? "bg-comun-paper text-comun-asphalt"
          : "bg-white text-comun-black";
  return <span className={`inline-flex border-2 border-comun-black px-2 py-1 text-xs font-black uppercase ${className}`}>{label}</span>;
}
