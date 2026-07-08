import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
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

export default async function AdminDossierReviewQueuePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await requireComunAdmin();
  const activeFilter = String(searchParams.filtro ?? "");
  const { items, summary } = await listAdminPautaDossierReviewQueue(activeFilter);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Dossies por pauta</p>
          <h1 className="text-3xl font-black uppercase">Fila de revisoes</h1>
        </div>
        <Link href="/comun/admin/dossies" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Todos os dossies</Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Pendente factual" value={summary.pendingFactual} />
        <Metric label="Pendente editorial" value={summary.pendingEditorial} />
        <Metric label="Bloqueados" value={summary.blocked} />
        <Metric label="Prontos" value={summary.readyToPublish} />
      </section>

      <form className="mt-5 flex flex-wrap items-end gap-2 border-2 border-comun-black bg-white p-3">
        <label className="grid gap-1 text-xs font-black uppercase">Filtro<select name="filtro" defaultValue={activeFilter} className="min-h-10 border-2 border-comun-black px-2">{filters.map(([value, label]) => <option key={value || "todos"} value={value}>{label}</option>)}</select></label>
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Aplicar</button>
        <Link href="/comun/admin/dossies/revisoes" className="inline-flex min-h-10 items-center border-2 border-comun-black px-3 text-xs font-black uppercase">Limpar</Link>
      </form>

      <section className="mt-5 overflow-x-auto border-2 border-comun-black bg-white">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-comun-black text-comun-paper">
            <tr>
              <Th>Dossie</Th>
              <Th>Pauta</Th>
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
              <tr key={item.id} className="border-t-2 border-comun-black align-top">
                <Td>
                  <p className="font-black uppercase">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-comun-asphalt/55">{item.public_slug ?? item.slug}</p>
                </Td>
                <Td>{item.pauta?.title ?? "Pauta removida"}</Td>
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
                  <p>Factual: {item.review_state.factualReviewer ?? "-"}</p>
                  <p>Editorial: {item.review_state.editorialReviewer ?? "-"}</p>
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

function Th({ children }: { children: ReactNode }) {
  return <th className="p-3 text-xs font-black uppercase">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="p-3">{children}</td>;
}
