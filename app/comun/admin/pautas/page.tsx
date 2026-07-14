import Link from "next/link";
import { upsertPautaSpaceAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listCommunities, listIssues } from "@/lib/comun-data";
import { listAdminPautaSpaces } from "@/lib/pauta-spaces";

const statusOptions = ["observing", "organizing", "drafting", "pressuring", "resolved", "unresolved", "archived"];

export default async function AdminPautaSpacesPage() {
  const session = await requireComunAdmin();
  const [spaces, communities, issues] = await Promise.all([listAdminPautaSpaces(), listCommunities(), listIssues()]);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Pautas sociais</h1>
          <p className="mt-2 text-sm text-comun-asphalt/75">Espacos horizontais de discussao, sintese, proposta e tarefa coletiva.</p>
        </div>
        <Link href="/comun/pautas" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Ver publico</Link>
      </div>

      <form action={upsertPautaSpaceAction} className="mt-5 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
        <h2 className="text-xl font-black uppercase md:col-span-2">Criar pauta</h2>
        <Input name="title" label="Titulo" required />
        <Input name="slug" label="Slug opcional" />
        <label className="grid gap-1 text-sm font-black uppercase">Comunidade<select name="community" className="min-h-11 border-2 border-comun-black px-2"><option value="">Aberta</option>{communities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Pauta/categoria<select name="category" className="min-h-11 border-2 border-comun-black px-2"><option value="">Sem categoria</option>{issues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.title}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" className="min-h-11 border-2 border-comun-black px-2">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Visibilidade<select name="visibility" className="min-h-11 border-2 border-comun-black px-2"><option value="public">Publica</option><option value="internal">Interna</option></select></label>
        <Textarea name="summary" label="Resumo" />
        <Textarea name="public_synthesis" label="Sintese publica" />
        <Textarea name="next_step" label="Proximo passo" />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Criar pauta social</button>
      </form>

      <div className="mt-6 grid gap-3">
        {spaces.map((space) => (
          <article key={space.id} className="border-2 border-comun-black bg-white p-4">
            <p className="text-xs font-black uppercase text-comun-asphalt/60">{space.status} / {space.visibility} / {space.community ?? "aberta"}</p>
            <h2 className="mt-2 text-xl font-black uppercase">{space.title}</h2>
            <p className="mt-2 text-sm text-comun-asphalt/75">{space.summary ?? "Sem resumo."}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase text-comun-asphalt/70">
              <span>{space.stats.reportCount} relatos</span>
              <span>{space.stats.officialProtocolCount} protocolos</span>
              <span>{space.stats.pendingContributionCount} pendentes</span>
              <span>{space.stats.openTaskCount} tarefas abertas</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/comun/admin/pautas/${space.id}`} className="border-2 border-comun-black bg-comun-black px-3 py-2 text-sm font-black uppercase text-comun-yellow">Administrar</Link>
              <Link href={`/comun/pautas/${space.slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir publica</Link>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

function Input({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input name={name} required={required} className="min-h-11 border-2 border-comun-black px-3" /></label>;
}

function Textarea({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">{label}<textarea name={name} rows={3} className="border-2 border-comun-black p-3" /></label>;
}
