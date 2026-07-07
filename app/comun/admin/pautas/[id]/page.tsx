import Link from "next/link";
import { notFound } from "next/navigation";
import { moderatePautaContributionAction, upsertPautaSpaceAction, upsertPautaTaskAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { getAdminPautaSpace, listAdminPautaContributions, listAdminPautaTasks, listSafePautaOfficialProtocols, listSafePautaReports } from "@/lib/pauta-spaces";

const statusOptions = ["observing", "organizing", "drafting", "pressuring", "resolved", "unresolved", "archived"];
const contributionStatuses = ["approved", "rejected", "archived"] as const;
const taskStatuses = ["open", "in_progress", "done", "blocked", "archived"] as const;

export default async function AdminPautaSpaceDetailPage({ params }: { params: { id: string } }) {
  const session = await requireComunAdmin();
  const space = await getAdminPautaSpace(params.id);
  if (!space) notFound();
  const [contributions, tasks, reports, protocols] = await Promise.all([
    listAdminPautaContributions(space.id),
    listAdminPautaTasks(space.id),
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
  ]);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Pauta social</p>
          <h1 className="text-3xl font-black uppercase">{space.title}</h1>
        </div>
        <Link href={`/comun/pautas/${space.slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir publica</Link>
      </div>

      <form action={upsertPautaSpaceAction} className="mt-5 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={space.id} />
        <Input name="title" label="Titulo" defaultValue={space.title} />
        <Input name="slug" label="Slug" defaultValue={space.slug} />
        <Input name="community" label="Comunidade" defaultValue={space.community ?? ""} />
        <Input name="category" label="Pauta/categoria" defaultValue={space.category ?? ""} />
        <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" defaultValue={space.status} className="min-h-11 border-2 border-comun-black px-2">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Visibilidade<select name="visibility" defaultValue={space.visibility} className="min-h-11 border-2 border-comun-black px-2"><option value="public">Publica</option><option value="internal">Interna</option></select></label>
        <Textarea name="summary" label="Resumo" defaultValue={space.summary ?? ""} />
        <Textarea name="public_synthesis" label="Sintese publica" defaultValue={space.public_synthesis ?? ""} />
        <Textarea name="next_step" label="Proximo passo" defaultValue={space.next_step ?? ""} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Salvar pauta</button>
      </form>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Contribuicoes pendentes</h2>
        <div className="mt-3 grid gap-3">
          {contributions.filter((item) => item.status === "pending").map((item) => (
            <ContributionModeration key={item.id} item={item} pautaId={space.id} />
          ))}
          {!contributions.some((item) => item.status === "pending") ? <p className="border-2 border-comun-black bg-white p-4">Sem contribuicoes pendentes.</p> : null}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Contribuicoes aprovadas</h2>
        <div className="mt-3 grid gap-3">
          {contributions.filter((item) => item.status === "approved").map((item) => <ContributionModeration key={item.id} item={item} pautaId={space.id} />)}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Tarefas</h2>
        <form action={upsertPautaTaskAction} className="mt-3 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
          <input type="hidden" name="pauta_id" value={space.id} />
          <Input name="title" label="Titulo" />
          <Input name="owner_alias" label="Responsavel/apelido" />
          <Textarea name="description" label="Descricao" />
          <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" className="min-h-11 border-2 border-comun-black px-2">{taskStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-black uppercase">Precisa de ajuda<select name="help_needed" className="min-h-11 border-2 border-comun-black px-2"><option value="true">Sim</option><option value="false">Nao</option></select></label>
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Criar tarefa</button>
        </form>
        <div className="mt-3 grid gap-3">
          {tasks.map((task) => (
            <form key={task.id} action={upsertPautaTaskAction} className="grid gap-2 border-2 border-comun-black bg-white p-4 md:grid-cols-4">
              <input type="hidden" name="pauta_id" value={space.id} />
              <input type="hidden" name="task_id" value={task.id} />
              <input name="title" defaultValue={task.title} className="min-h-10 border-2 border-comun-black px-2" />
              <input name="description" defaultValue={task.description ?? ""} className="min-h-10 border-2 border-comun-black px-2" />
              <select name="status" defaultValue={task.status} className="min-h-10 border-2 border-comun-black px-2">{taskStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
              <button className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Atualizar tarefa</button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black uppercase">Relatos vinculados</h2>
          <p className="mt-2 text-sm">{reports.length} relatos sanitizados neste recorte.</p>
        </div>
        <div className="border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black uppercase">Protocolos vinculados</h2>
          <p className="mt-2 text-sm">{protocols.length} protocolos oficiais neste recorte.</p>
        </div>
      </section>
    </AdminShell>
  );
}

function ContributionModeration({ item, pautaId }: { item: any; pautaId: string }) {
  return (
    <article className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{item.contribution_type} / {item.status} / {item.author_alias || "anonimo"}</p>
      <p className="mt-2 text-sm text-comun-asphalt/80">{item.body}</p>
      {item.contact_private ? <p className="mt-2 text-xs font-bold text-comun-red">Contato privado registrado internamente.</p> : null}
      <form action={moderatePautaContributionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="contribution_id" value={item.id} />
        <input type="hidden" name="pauta_id" value={pautaId} />
        <select name="status" defaultValue={item.status === "pending" ? "approved" : item.status} className="min-h-10 border-2 border-comun-black px-2">{contributionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <input name="moderator_notes" defaultValue={item.moderator_notes ?? ""} placeholder="Nota de moderacao" className="min-h-10 border-2 border-comun-black px-2" />
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Salvar</button>
      </form>
    </article>
  );
}

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-3" /></label>;
}

function Textarea({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">{label}<textarea name={name} defaultValue={defaultValue} rows={3} className="border-2 border-comun-black p-3" /></label>;
}
