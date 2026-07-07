import Link from "next/link";
import { moderatePautaContributionAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminPautaContributionQueue, listAdminPautaSpaces } from "@/lib/pauta-spaces";

const statuses = ["", "pending", "approved", "rejected", "archived"] as const;
const riskLevels = ["", "normal", "attention", "high"] as const;
const types = ["", "relato", "evidencia", "proposta", "duvida", "contraponto", "encaminhamento", "tarefa_oferecida"] as const;

export default async function AdminPautaContributionsQueuePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await requireComunAdmin();
  const [items, spaces] = await Promise.all([
    listAdminPautaContributionQueue({
      status: searchParams.status || "pending",
      riskLevel: searchParams.risco,
      contributionType: searchParams.tipo,
      pautaId: searchParams.pauta,
      createdFrom: searchParams.data_de,
      createdTo: searchParams.data_ate,
    }),
    listAdminPautaSpaces(),
  ]);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Moderacao de contribuicoes</h1>
          <p className="mt-2 max-w-3xl text-sm text-comun-asphalt/75">
            Fila global de contribuicoes das pautas sociais. Metadados tecnicos e hashes nao sao exibidos aqui.
          </p>
        </div>
        <Link href="/comun/admin/pautas" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Voltar a pautas</Link>
      </div>

      <form className="mt-5 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-6">
        <Select name="status" label="Status" values={statuses} defaultValue={searchParams.status ?? "pending"} />
        <Select name="risco" label="Risco" values={riskLevels} defaultValue={searchParams.risco} />
        <Select name="tipo" label="Tipo" values={types} defaultValue={searchParams.tipo} />
        <label className="grid gap-1 text-sm font-black uppercase">
          Pauta
          <select name="pauta" defaultValue={searchParams.pauta ?? ""} className="min-h-11 border-2 border-comun-black px-2">
            <option value="">Todas</option>
            {spaces.map((space) => <option key={space.id} value={space.id}>{space.title}</option>)}
          </select>
        </label>
        <DateInput name="data_de" label="Data de" defaultValue={searchParams.data_de} />
        <DateInput name="data_ate" label="Data ate" defaultValue={searchParams.data_ate} />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-6">Filtrar</button>
      </form>

      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="border-2 border-comun-black bg-white p-4">
            <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
              <Badge tone={item.risk_level === "high" ? "urgent" : item.risk_level === "attention" ? "attention" : "safe"}>{item.risk_level}</Badge>
              <Badge tone={item.moderation_priority === "possible_abuse" ? "urgent" : item.moderation_priority === "review_first" ? "attention" : "safe"}>{item.moderation_priority}</Badge>
              <span className="border-2 border-comun-black px-2 py-1">{item.status}</span>
              <span className="border-2 border-comun-black px-2 py-1">{item.contribution_type}</span>
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <p className="text-xs font-black uppercase text-comun-asphalt/60">Pauta</p>
                <h2 className="mt-1 text-lg font-black uppercase">{item.pauta?.title ?? item.pauta_id}</h2>
                <p className="mt-2 text-sm text-comun-asphalt/80">{truncate(item.body, 420)}</p>
                <dl className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Meta label="Autor/apelido" value={item.author_alias || "Anonimo"} />
                  <Meta label="Data" value={formatDate(item.created_at)} />
                  <Meta label="Motivos de risco" value={item.risk_reasons?.length ? item.risk_reasons.join(", ") : "-"} />
                </dl>
              </div>
              <div className="grid gap-2">
                {item.pauta ? <Link href={`/comun/pautas/${item.pauta.slug}`} className="min-h-10 border-2 border-comun-black bg-white px-3 py-2 text-center text-xs font-black uppercase">Abrir publica</Link> : null}
                <Link href={`/comun/admin/pautas/${item.pauta_id}`} className="min-h-10 border-2 border-comun-black bg-comun-black px-3 py-2 text-center text-xs font-black uppercase text-comun-yellow">Abrir admin da pauta</Link>
                <form action={moderatePautaContributionAction} className="grid gap-2 border-2 border-comun-black bg-comun-paper p-3">
                  <input type="hidden" name="contribution_id" value={item.id} />
                  <input type="hidden" name="pauta_id" value={item.pauta_id} />
                  <select name="status" defaultValue="approved" className="min-h-10 border-2 border-comun-black px-2 text-sm">
                    <option value="approved">Aprovar</option>
                    <option value="rejected">Rejeitar</option>
                    <option value="archived">Arquivar</option>
                  </select>
                  <input name="moderator_notes" placeholder="Nota de moderacao" className="min-h-10 border-2 border-comun-black px-2 text-sm" />
                  <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-2 text-xs font-black uppercase">Salvar decisao</button>
                </form>
              </div>
            </div>
          </article>
        ))}
        {!items.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhuma contribuicao encontrada.</p> : null}
      </div>
    </AdminShell>
  );
}

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: readonly string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className="min-h-11 border-2 border-comun-black px-2">
        {values.map((value) => <option key={value || "all"} value={value}>{value || "Todos"}</option>)}
      </select>
    </label>
  );
}

function DateInput({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input type="date" name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-2" /></label>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-black uppercase text-comun-asphalt/60">{label}</dt><dd className="mt-1">{value}</dd></div>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "urgent" | "attention" | "safe" }) {
  const classes = {
    urgent: "border-comun-red text-comun-red bg-white",
    attention: "border-comun-black text-comun-black bg-comun-yellow",
    safe: "border-comun-black text-comun-black bg-comun-paper",
  };
  return <span className={`border-2 px-2 py-1 ${classes[tone]}`}>{children}</span>;
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
