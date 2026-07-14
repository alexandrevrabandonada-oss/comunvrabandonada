import Link from "next/link";
import type { ReactNode } from "react";
import { archiveAdminNotificationAction, markAdminNotificationReadAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminNotifications, summarizeAdminNotifications } from "@/lib/admin-notifications";

const statusOptions = [
  ["", "Todas"],
  ["unread", "Nao lidas"],
  ["read", "Lidas"],
  ["archived", "Arquivadas"],
] as const;

const kindOptions = [
  ["", "Todos"],
  ["dossier_overdue", "Vencidas"],
  ["dossier_due_today", "Vencem hoje"],
  ["dossier_priority_high", "Alta prioridade"],
  ["dossier_ready_to_publish", "Prontas para publicar"],
  ["dossier_changes_requested", "Ajustes solicitados"],
  ["dossier_blocked_same_reviewer", "Mesmo revisor"],
  ["dossier_factual_assigned", "Atribuicao factual"],
  ["dossier_editorial_assigned", "Atribuicao editorial"],
] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminNotificationsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdmin();
  const notifications = await listAdminNotifications({
    status: searchParams.status,
    kind: searchParams.tipo,
    assignedTo: searchParams.responsavel,
    assignedToUserId: searchParams.minhas === "1" ? session.profile?.id : undefined,
  });
  const summary = summarizeAdminNotifications(notifications);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Operacao interna</p>
          <h1 className="text-3xl font-black uppercase">Notificacoes</h1>
        </div>
        <Link href="/comun/admin/dossies/revisoes" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Fila de revisoes</Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-5">
        <Metric label="Nao lidas" value={summary.unread} />
        <Metric label="Vencidas" value={summary.overdue} />
        <Metric label="Alta prioridade" value={summary.highPriority} />
        <Metric label="Prontas" value={summary.readyToPublish} />
        <Metric label="Arquivadas" value={summary.archived} />
      </section>

      <form className="mt-5 flex flex-wrap items-end gap-2 border-2 border-comun-black bg-white p-3">
        <label className="grid gap-1 text-xs font-black uppercase">Status<select name="status" defaultValue={searchParams.status ?? ""} className="min-h-10 border-2 border-comun-black px-2">{statusOptions.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-black uppercase">Tipo<select name="tipo" defaultValue={searchParams.tipo ?? ""} className="min-h-10 border-2 border-comun-black px-2">{kindOptions.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-black uppercase">Responsavel<input name="responsavel" defaultValue={searchParams.responsavel ?? ""} className="min-h-10 border-2 border-comun-black px-2" /></label>
        {session.profile ? <label className="flex min-h-10 items-center gap-2 border-2 border-comun-black px-3 text-xs font-black uppercase"><input type="checkbox" name="minhas" value="1" defaultChecked={searchParams.minhas === "1"} /> Minhas pendencias</label> : null}
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Aplicar</button>
        <Link href="/comun/admin/notificacoes" className="inline-flex min-h-10 items-center border-2 border-comun-black px-3 text-xs font-black uppercase">Limpar</Link>
      </form>

      <section className="mt-5 grid gap-3">
        {notifications.map((notification) => (
          <article key={notification.id} className={`border-2 border-comun-black bg-white p-4 ${notification.status === "unread" ? "shadow-[4px_4px_0_#111]" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{notification.kind} / {notification.priority} / {notification.status}</p>
                <h2 className="mt-1 text-lg font-black uppercase">{notification.title}</h2>
                {notification.body ? <p className="mt-2 text-sm text-comun-asphalt/75">{notification.body}</p> : null}
                <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/60">
                  Responsavel: {notification.assigned_to || "-"} / {new Date(notification.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/comun/admin/dossies/${notification.target_id}`} className="inline-flex min-h-10 items-center border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Abrir dossie</Link>
                {notification.status === "unread" ? <NotificationButton action={markAdminNotificationReadAction} id={notification.id}>Marcar lida</NotificationButton> : null}
                {notification.status !== "archived" ? <NotificationButton action={archiveAdminNotificationAction} id={notification.id}>Arquivar</NotificationButton> : null}
              </div>
            </div>
          </article>
        ))}
        {!notifications.length ? <p className="border-2 border-comun-black bg-white p-4 text-sm text-comun-asphalt/70">Nenhuma notificacao encontrada para este filtro.</p> : null}
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-2 border-comun-black bg-white p-4"><p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function NotificationButton({ action, id, children }: { action: (formData: FormData) => Promise<void>; id: string; children: ReactNode }) {
  return (
    <form action={action}>
      <input type="hidden" name="notification_id" value={id} />
      <button className="min-h-10 border-2 border-comun-black px-3 text-xs font-black uppercase">{children}</button>
    </form>
  );
}
