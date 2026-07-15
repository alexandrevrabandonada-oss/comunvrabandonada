import Link from "next/link";
import { notFound } from "next/navigation";
import { createPautaDossierDraftAction, moderatePautaContributionAction, regeneratePautaDossierDraftAction, updatePautaEditorialChecklistAction, upsertPautaEvidenceAction, upsertPautaSpaceAction, upsertPautaTaskAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminPautaDossiers } from "@/lib/pauta-dossiers";
import { getAdminPautaSpace, listAdminPautaContributions, listAdminPautaEvidence, listAdminPautaTasks, listPautaSynthesisVersions, listSafePautaOfficialProtocols, listSafePautaReports } from "@/lib/pauta-spaces";

const statusOptions = ["observing", "organizing", "drafting", "pressuring", "resolved", "unresolved", "archived"];
const contributionStatuses = ["approved", "rejected", "archived"] as const;
const taskStatuses = ["open", "assigned", "in_progress", "done", "blocked", "cancelled", "archived"] as const;
const publicStatuses = ["received", "triage", "investigating", "collecting_evidence", "building_proposal", "ready_for_action", "active_mobilization", "awaiting_response", "monitoring", "partial_win", "resolved", "no_progress", "archived"] as const;
const checklistItems = [
  ["no_personal_data", "Sintese nao contem dados pessoais"],
  ["no_private_contact", "Sintese nao expoe contato privado"],
  ["no_full_response", "Sintese nao usa resposta oficial completa sem resumo publico"],
  ["has_approved_evidence", "Ha pelo menos uma evidencia aprovada"],
  ["clear_next_step", "O proximo passo esta claro"],
  ["objective_language", "Linguagem esta objetiva e nao ofensiva"],
  ["fact_report_proposal_distinction", "Ha distincao entre fato, relato e proposta"],
  ["no_pending_publication", "Pauta nao publica contribuicao pendente"],
  ["dossier_candidate", "Pauta pode virar dossie futuramente"],
] as const;

export default async function AdminPautaSpaceDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireComunAdmin();
  const space = await getAdminPautaSpace(params.id);
  if (!space) notFound();
  const [contributions, tasks, reports, protocols, evidence, versions, dossiers] = await Promise.all([
    listAdminPautaContributions(space.id),
    listAdminPautaTasks(space.id),
    listSafePautaReports(space),
    listSafePautaOfficialProtocols(space),
    listAdminPautaEvidence(space.id),
    listPautaSynthesisVersions(space.id),
    listAdminPautaDossiers({ pautaId: space.id }),
  ]);
  const checked = new Set(space.editorial_checklist ?? []);

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Pauta social</p>
          <h1 className="text-3xl font-black uppercase">{space.title}</h1>
        </div>
        <Link href={`/comun/pautas/${space.slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Abrir publica</Link>
      </div>

      <section className="mt-5 border-2 border-comun-black bg-comun-black p-4 text-comun-paper">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase text-comun-yellow">Dossie da pauta</h2>
            <p className="mt-1 text-sm text-comun-paper/70">Rascunho interno gerado a partir de evidencias publicas aprovadas, protocolos sanitizados e tarefas abertas.</p>
          </div>
          <form action={createPautaDossierDraftAction}>
            <input type="hidden" name="pauta_id" value={space.id} />
            <button className="min-h-11 border-2 border-comun-yellow px-3 text-sm font-black uppercase text-comun-yellow">Criar rascunho</button>
          </form>
        </div>
        <div className="mt-4 grid gap-3">
          {dossiers.map((dossier) => (
            <article key={dossier.id} className="border-2 border-comun-yellow bg-comun-paper p-3 text-comun-black">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossier.status}</p>
                  <h3 className="font-black uppercase">{dossier.title}</h3>
                  <p className="text-xs font-bold text-comun-asphalt/60">Atualizado em {formatDate(dossier.updated_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/comun/admin/dossies/${dossier.id}`} className="border-2 border-comun-black bg-white px-3 py-2 text-xs font-black uppercase">Abrir editor</Link>
                  <form action={regeneratePautaDossierDraftAction}>
                    <input type="hidden" name="dossier_id" value={dossier.id} />
                    <input type="hidden" name="pauta_id" value={space.id} />
                    <button className="min-h-9 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Regenerar</button>
                  </form>
                </div>
              </div>
            </article>
          ))}
          {!dossiers.length ? <p className="border-2 border-comun-yellow p-3 text-sm text-comun-paper/70">Nenhum dossie criado para esta pauta.</p> : null}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-black uppercase">Dados da pauta</h2>
      <form action={upsertPautaSpaceAction} className="mt-3 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={space.id} />
        <Input name="title" label="Titulo" defaultValue={space.title} />
        <Input name="slug" label="Slug" defaultValue={space.slug} />
        <Input name="community" label="Comunidade" defaultValue={space.community ?? ""} />
        <Input name="category" label="Pauta/categoria" defaultValue={space.category ?? ""} />
        <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" defaultValue={space.status} className="min-h-11 border-2 border-comun-black px-2">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-black uppercase">Visibilidade<select name="visibility" defaultValue={space.visibility} className="min-h-11 border-2 border-comun-black px-2"><option value="public">Publica</option><option value="internal">Interna</option></select></label>
        <Select name="public_status" label="Status público" values={[...publicStatuses]} defaultValue={space.public_status} />
        <Input name="internal_status" label="Status operacional interno" defaultValue={space.internal_status} />
        <Select name="priority" label="Prioridade" values={["low", "normal", "high", "critical"]} defaultValue={space.priority} />
        <Select name="urgency" label="Urgência" values={["low", "normal", "high", "immediate"]} defaultValue={space.urgency} />
        <Select name="risk_level" label="Risco" values={["normal", "attention", "high", "critical"]} defaultValue={space.risk_level} />
        <Input name="responsible_public" label="Responsável público" defaultValue={space.responsible_public ?? ""} />
        <Input name="responsible_internal" label="Responsável interno" defaultValue={space.responsible_internal ?? ""} />
        <Textarea name="summary" label="Resumo" defaultValue={space.summary ?? ""} />
        <Textarea name="affected_people_public" label="Pessoas ou grupos afetados" defaultValue={space.affected_people_public ?? ""} />
        <Textarea name="problem_public" label="Problema público" defaultValue={space.problem_public ?? ""} />
        <Textarea name="demand_public" label="Demanda pública" defaultValue={space.demand_public ?? ""} />
        <Textarea name="proposals_public" label="Propostas públicas" defaultValue={space.proposals_public ?? ""} />
        <Textarea name="participation_public" label="Como participar" defaultValue={space.participation_public ?? ""} />
        <Textarea name="public_synthesis" label="Sintese publica" defaultValue={space.public_synthesis ?? ""} />
        <Textarea name="next_step" label="Proximo passo" defaultValue={space.next_step ?? ""} />
        <Textarea name="editor_note" label="Nota editorial da alteracao" />
        <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Salvar pauta</button>
      </form>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Checklist editorial</h2>
        <form action={updatePautaEditorialChecklistAction} className="mt-3 grid gap-2 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
          <input type="hidden" name="pauta_id" value={space.id} />
          {checklistItems.map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 text-sm font-bold">
              <input type="checkbox" name="editorial_checklist" value={value} defaultChecked={checked.has(value)} className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Salvar checklist</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Evidencias</h2>
        <form action={upsertPautaEvidenceAction} className="mt-3 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
          <input type="hidden" name="pauta_id" value={space.id} />
          <Input name="title" label="Titulo" />
          <Input name="summary" label="Resumo" />
          <Select name="source_type" label="Fonte" values={["manual", "contribution", "report", "official_protocol", "external_reference"]} />
          <Select name="evidence_type" label="Tipo" values={["relato", "foto_segura", "protocolo", "resposta_oficial", "dado_agregado", "documento", "testemunho", "outro"]} />
          <Select name="sensitivity" label="Sensibilidade" values={["public_safe", "needs_review", "private_only"]} />
          <Select name="status" label="Status" values={["candidate", "approved", "rejected", "archived"]} />
          <Textarea name="public_note" label="Nota publica" />
          <Textarea name="internal_note" label="Nota interna" />
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase md:col-span-2">Criar evidencia</button>
        </form>
        <div className="mt-3 grid gap-3">
          {evidence.map((item) => (
            <form key={item.id} action={upsertPautaEvidenceAction} className="grid gap-2 border-2 border-comun-black bg-white p-4 md:grid-cols-4">
              <input type="hidden" name="pauta_id" value={space.id} />
              <input type="hidden" name="evidence_id" value={item.id} />
              <input type="hidden" name="source_id" value={item.source_id ?? ""} />
              <Select name="source_type" label="Fonte" values={["manual", "contribution", "report", "official_protocol", "external_reference"]} defaultValue={item.source_type} />
              <Input name="title" label="Titulo" defaultValue={item.title} />
              <Select name="evidence_type" label="Tipo" values={["relato", "foto_segura", "protocolo", "resposta_oficial", "dado_agregado", "documento", "testemunho", "outro"]} defaultValue={item.evidence_type} />
              <Select name="status" label="Status" values={["candidate", "approved", "rejected", "archived"]} defaultValue={item.status} />
              <Select name="sensitivity" label="Sensibilidade" values={["public_safe", "needs_review", "private_only"]} defaultValue={item.sensitivity} />
              <input name="summary" defaultValue={item.summary ?? ""} className="min-h-10 border-2 border-comun-black px-2 md:col-span-3" />
              <input name="public_note" defaultValue={item.public_note ?? ""} className="min-h-10 border-2 border-comun-black px-2 md:col-span-2" placeholder="Nota publica" />
              <input name="internal_note" defaultValue={item.internal_note ?? ""} className="min-h-10 border-2 border-comun-black px-2 md:col-span-2" placeholder="Nota interna" />
              <button className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase md:col-span-4">Atualizar evidencia</button>
            </form>
          ))}
          {!evidence.length ? <p className="border-2 border-comun-black bg-white p-4">Sem evidencias cadastradas.</p> : null}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Contribuicoes pendentes</h2>
        <div className="mt-3 grid gap-3">
          {contributions.filter((item) => item.status === "pending").map((item) => (
            <ContributionModeration key={item.id} item={item} pautaId={space.id} canMarkEvidence={false} />
          ))}
          {!contributions.some((item) => item.status === "pending") ? <p className="border-2 border-comun-black bg-white p-4">Sem contribuicoes pendentes.</p> : null}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Contribuicoes aprovadas</h2>
        <div className="mt-3 grid gap-3">
          {contributions.filter((item) => item.status === "approved").map((item) => <ContributionModeration key={item.id} item={item} pautaId={space.id} canMarkEvidence />)}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Tarefas</h2>
        <form action={upsertPautaTaskAction} className="mt-3 grid gap-3 border-2 border-comun-black bg-white p-4 md:grid-cols-2">
          <input type="hidden" name="pauta_id" value={space.id} />
          <Input name="title" label="Titulo" />
          <Input name="owner_alias" label="Responsavel/apelido" />
          <Textarea name="description" label="Descricao" />
          <Input name="required_skill" label="Habilidade necessária" />
          <Input name="participant_limit" label="Limite de participantes" />
          <label className="grid gap-1 text-sm font-black uppercase">Status<select name="status" className="min-h-11 border-2 border-comun-black px-2">{taskStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <Select name="priority" label="Prioridade" values={["low", "normal", "high", "critical"]} />
          <Select name="visibility" label="Visibilidade" values={["public", "internal", "archived"]} />
          <Select name="accepts_volunteers" label="Aceita voluntários" values={["true", "false"]} />
          <label className="grid gap-1 text-sm font-black uppercase">Precisa de ajuda<select name="help_needed" className="min-h-11 border-2 border-comun-black px-2"><option value="true">Sim</option><option value="false">Nao</option></select></label>
          <Textarea name="result_public" label="Resultado público" />
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
              <select name="priority" defaultValue={task.priority} className="min-h-10 border-2 border-comun-black px-2">{["low", "normal", "high", "critical"].map((value) => <option key={value}>{value}</option>)}</select>
              <input type="hidden" name="required_skill" value={task.required_skill ?? ""} />
              <input type="hidden" name="visibility" value={task.visibility} />
              <input type="hidden" name="accepts_volunteers" value={String(task.accepts_volunteers)} />
              <input type="hidden" name="participant_limit" value={task.participant_limit ?? ""} />
              <input type="hidden" name="result_public" value={task.result_public ?? ""} />
              <input type="hidden" name="owner_alias" value={task.owner_alias ?? ""} />
              <input type="hidden" name="due_at" value={task.due_at ?? ""} />
              <input type="hidden" name="help_needed" value={String(task.help_needed)} />
              <button className="min-h-10 border-2 border-comun-black bg-white px-2 text-xs font-black uppercase">Atualizar tarefa</button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black uppercase">Relatos vinculados</h2>
          <p className="mt-2 text-sm">{reports.length} relatos sanitizados neste recorte.</p>
          <div className="mt-3 grid gap-2">
            {reports.slice(0, 5).map((report: any) => (
              <QuickEvidenceForm key={report.id} pautaId={space.id} sourceType="report" sourceId={report.id} title={report.title ?? report.protocol} summary={report.public_text ?? ""} evidenceType="relato" />
            ))}
          </div>
        </div>
        <div className="border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black uppercase">Protocolos vinculados</h2>
          <p className="mt-2 text-sm">{protocols.length} protocolos oficiais neste recorte.</p>
          <div className="mt-3 grid gap-2">
            {protocols.slice(0, 5).map((protocol: any) => (
              <QuickEvidenceForm key={protocol.id} pautaId={space.id} sourceType="official_protocol" sourceId={protocol.id} title={protocol.official_protocol_number ?? protocol.comun_protocol} summary={protocol.public_summary ?? `Status: ${protocol.status}`} evidenceType="protocolo" />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black uppercase">Historico de versoes</h2>
        <div className="mt-3 grid gap-3">
          {versions.map((version) => (
            <article key={version.id} className="border-2 border-comun-black bg-white p-4">
              <p className="text-xs font-black uppercase text-comun-asphalt/60">{new Date(version.created_at).toLocaleString("pt-BR")}</p>
              {version.editor_note ? <p className="mt-2 text-sm font-bold">Nota: {version.editor_note}</p> : null}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <VersionBlock title="Sintese anterior" value={version.previous_public_synthesis} />
                <VersionBlock title="Sintese nova" value={version.new_public_synthesis} />
                <VersionBlock title="Passo anterior" value={version.previous_next_step} />
                <VersionBlock title="Passo novo" value={version.new_next_step} />
              </div>
            </article>
          ))}
          {!versions.length ? <p className="border-2 border-comun-black bg-white p-4">Sem versoes registradas ainda.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}

function ContributionModeration({ item, pautaId, canMarkEvidence }: { item: any; pautaId: string; canMarkEvidence: boolean }) {
  return (
    <article className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/60">{item.contribution_type} / {item.status} / {item.author_alias || "anonimo"}</p>
      <p className="mt-2 text-sm text-comun-asphalt/80">{item.body}</p>
      <p className="mt-2 text-xs font-black uppercase text-comun-asphalt/60">
        Risco: {item.risk_level ?? "normal"} / prioridade: {item.moderation_priority ?? "normal"} / motivos: {item.risk_reasons?.length ? item.risk_reasons.join(", ") : "-"}
      </p>
      {item.contact_private ? <p className="mt-2 text-xs font-bold text-comun-red">Contato privado registrado internamente.</p> : null}
      <form action={moderatePautaContributionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="contribution_id" value={item.id} />
        <input type="hidden" name="pauta_id" value={pautaId} />
        <select name="status" defaultValue={item.status === "pending" ? "approved" : item.status} className="min-h-10 border-2 border-comun-black px-2">{contributionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <input name="moderator_notes" defaultValue={item.moderator_notes ?? ""} placeholder="Nota de moderacao" className="min-h-10 border-2 border-comun-black px-2" />
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Salvar</button>
      </form>
      {canMarkEvidence ? (
        <QuickEvidenceForm pautaId={pautaId} sourceType="contribution" sourceId={item.id} title={`${item.contribution_type}: ${item.author_alias || "anonimo"}`} summary={item.body} evidenceType="testemunho" />
      ) : null}
    </article>
  );
}

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<input name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-3" /></label>;
}

function Select({ name, label, values, defaultValue }: { name: string; label: string; values: string[]; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase">{label}<select name={name} defaultValue={defaultValue} className="min-h-11 border-2 border-comun-black px-2">{values.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>;
}

function Textarea({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">{label}<textarea name={name} defaultValue={defaultValue} rows={3} className="border-2 border-comun-black p-3" /></label>;
}

function QuickEvidenceForm({ pautaId, sourceType, sourceId, title, summary, evidenceType }: { pautaId: string; sourceType: string; sourceId: string; title: string; summary: string; evidenceType: string }) {
  return (
    <form action={upsertPautaEvidenceAction} className="flex flex-wrap items-center gap-2 border border-comun-black bg-comun-paper p-2 text-xs">
      <input type="hidden" name="pauta_id" value={pautaId} />
      <input type="hidden" name="source_type" value={sourceType} />
      <input type="hidden" name="source_id" value={sourceId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="summary" value={summary} />
      <input type="hidden" name="evidence_type" value={evidenceType} />
      <input type="hidden" name="sensitivity" value="needs_review" />
      <input type="hidden" name="status" value="candidate" />
      <span className="font-bold">{title}</span>
      <button className="ml-auto border-2 border-comun-black bg-white px-2 py-1 font-black uppercase">Marcar evidencia</button>
    </form>
  );
}

function VersionBlock({ title, value }: { title: string; value: string | null }) {
  return <div><p className="text-xs font-black uppercase text-comun-asphalt/60">{title}</p><p className="mt-1 text-sm text-comun-asphalt/80">{truncate(value ?? "-", 220)}</p></div>;
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
