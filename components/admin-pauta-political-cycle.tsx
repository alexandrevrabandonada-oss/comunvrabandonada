import Link from "next/link";
import {
  createPautaDecisionDraft,
  initializePautaActionCycle,
  linkPautaActionCycleEntities,
  publishPautaDecision,
  transitionPautaActionCycle,
} from "@/app/comun/admin/pautas/[id]/political-cycle-actions";
import {
  allowedPautaActionCycleTargets,
  nextPautaActionCycleStep,
  type PautaActionCycleStage,
} from "@/lib/pauta-action-cycle";

export function AdminPautaPoliticalCycle({
  pautaId,
  enabled,
  cycle,
  synthesisVersions,
}: {
  pautaId: string;
  enabled: boolean;
  cycle: any;
  synthesisVersions: any[];
}) {
  if (!enabled)
    return (
      <section className="mt-5 border-2 border-comun-black bg-white p-4">
        <p className="text-xs font-black uppercase text-comun-asphalt/60">
          Esteira política
        </p>
        <h2 className="mt-1 text-xl font-black uppercase">
          Aguardando ativação controlada
        </h2>
        <p className="mt-2 text-sm text-comun-asphalt/70">
          O ciclo integrado permanece fechado até schema, RLS, ensaio
          autenticado e feature gate estarem comprovados.
        </p>
      </section>
    );

  if (!cycle)
    return (
      <section className="mt-5 border-2 border-comun-black bg-comun-yellow p-4">
        <p className="text-xs font-black uppercase">Cockpit político</p>
        <h2 className="mt-1 text-xl font-black uppercase">
          Iniciar processo acompanhável
        </h2>
        <p className="mt-2 max-w-3xl text-sm">
          Conecta contribuição, conversa, decisão, ação, protocolo, resultado e
          memória sem criar módulos paralelos.
        </p>
        <form action={initializePautaActionCycle} className="mt-4">
          <input type="hidden" name="pauta_id" value={pautaId} />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="public_visible" />
            Mostrar a jornada somente quando houver resumo público revisado
          </label>
          <button className="mt-3 min-h-11 border-2 border-comun-black bg-white px-4 font-black uppercase">
            Iniciar esteira
          </button>
        </form>
      </section>
    );

  const targets = allowedPautaActionCycleTargets(
    cycle.current_stage as PautaActionCycleStage,
  );
  const selectedAction = cycle.actions.find(
    (action: any) => action.id === cycle.collective_action_id,
  );

  return (
    <section className="mt-5 border-2 border-comun-black bg-comun-yellow p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase">
            Cockpit político · versão {cycle.state_version}
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase">
            {cycle.current_stage}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-bold">
            Próxima ação:{" "}
            {cycle.next_action_public ??
              nextPautaActionCycleStep(cycle.current_stage)}
          </p>
        </div>
        <p className="border-2 border-comun-black bg-white px-3 py-2 text-xs font-black uppercase">
          {cycle.public_visible ? "jornada pública" : "somente equipe"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <form
          action={linkPautaActionCycleEntities}
          className="grid gap-3 border-2 border-comun-black bg-white p-4"
        >
          <h3 className="font-black uppercase">Proveniência e vínculos</h3>
          <input type="hidden" name="pauta_id" value={pautaId} />
          <input type="hidden" name="cycle_id" value={cycle.id} />
          <Select
            name="decision_id"
            label="Decisão"
            value={cycle.decision_id}
            rows={cycle.decisions}
            rowLabel={(row) => `${row.public_title} · ${row.status}`}
          />
          <Select
            name="collective_action_id"
            label="Ação coletiva"
            value={cycle.collective_action_id}
            rows={cycle.actions}
            rowLabel={(row) => `${row.title} · ${row.status}`}
          />
          <Select
            name="forwarding_id"
            label="Encaminhamento"
            value={cycle.forwarding_id}
            rows={cycle.forwardings.filter(
              (row: any) =>
                !cycle.collective_action_id ||
                row.action_id === cycle.collective_action_id,
            )}
            rowLabel={(row) =>
              `${row.recipient_name ?? "destino em revisão"} · ${row.state}`
            }
          />
          <Select
            name="official_protocol_id"
            label="Protocolo oficial"
            value={cycle.official_protocol_id}
            rows={cycle.protocols}
            rowLabel={(row) =>
              `${row.official_protocol_number ?? row.comun_protocol} · ${row.status}`
            }
          />
          <Select
            name="result_id"
            label="Resultado verificado"
            value={cycle.result_id}
            rows={cycle.results}
            rowLabel={(row) => `${row.title} · ${row.verification_status}`}
          />
          <label className="grid gap-1 text-sm font-black uppercase">
            Papel responsável
            <select
              name="responsible_role"
              defaultValue={cycle.responsible_role}
              className="min-h-11 border-2 border-comun-black px-2"
            >
              {[
                "admin",
                "editor",
                "coordinator",
                "facilitator",
                "community_editor",
                "curator",
                "protocol_operator",
                "result_editor",
              ].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              name="public_visible"
              defaultChecked={cycle.public_visible}
            />
            Publicar somente a projeção revisada
          </label>
          <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">
            Salvar vínculos
          </button>
          {selectedAction?.slug ? (
            <Link
              href={`/comun/admin/acoes#${selectedAction.slug}`}
              className="text-sm font-black underline"
            >
              Abrir administração especializada da ação
            </Link>
          ) : null}
        </form>

        <div className="grid gap-4">
          <form
            action={createPautaDecisionDraft}
            className="grid gap-3 border-2 border-comun-black bg-white p-4"
          >
            <h3 className="font-black uppercase">Registrar decisão</h3>
            <input type="hidden" name="pauta_id" value={pautaId} />
            <Select
              name="synthesis_version_id"
              label="Versão da síntese"
              rows={synthesisVersions}
              rowLabel={(row) =>
                `${new Date(row.created_at).toLocaleDateString("pt-BR")} · ${row.editor_note ?? "sem nota"}`
              }
            />
            <Select
              name="circle_id"
              label="Roda de origem"
              rows={cycle.circles}
              rowLabel={(row) => `${row.title} · ${row.status}`}
            />
            <Field name="public_title" label="O que foi decidido" />
            <Area name="public_summary" label="Resumo público" />
            <Area name="public_justification" label="Justificativa pública" />
            <button className="min-h-11 border-2 border-comun-black bg-comun-yellow font-black uppercase">
              Salvar rascunho
            </button>
          </form>

          <div className="grid gap-2">
            {cycle.decisions.map((decision: any) => (
              <article
                key={decision.id}
                className="border-2 border-comun-black bg-white p-3"
              >
                <p className="text-xs font-black uppercase">
                  {decision.status}
                </p>
                <h4 className="font-black">{decision.public_title}</h4>
                <p className="mt-1 text-sm">{decision.public_summary}</p>
                {decision.status === "draft" ? (
                  <form action={publishPautaDecision} className="mt-3">
                    <input type="hidden" name="pauta_id" value={pautaId} />
                    <input
                      type="hidden"
                      name="decision_id"
                      value={decision.id}
                    />
                    <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">
                      Publicar após revisão por outra pessoa
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>

      {targets.length ? (
        <form
          action={transitionPautaActionCycle}
          className="mt-4 grid gap-3 border-2 border-comun-black bg-comun-black p-4 text-comun-paper md:grid-cols-2"
        >
          <h3 className="font-black uppercase text-comun-yellow md:col-span-2">
            Avançar com evidência
          </h3>
          <input type="hidden" name="pauta_id" value={pautaId} />
          <input type="hidden" name="cycle_id" value={cycle.id} />
          <input
            type="hidden"
            name="expected_version"
            value={cycle.state_version}
          />
          <label className="grid gap-1 text-sm font-black uppercase">
            Próxima etapa
            <select
              name="to_stage"
              className="min-h-11 border-2 border-comun-yellow bg-comun-black px-2"
            >
              {targets.map((target) => (
                <option key={target}>{target}</option>
              ))}
            </select>
          </label>
          <Field name="public_summary" label="Resumo público da mudança" dark />
          <Area name="private_note" label="Nota interna opcional" dark />
          <button className="min-h-11 border-2 border-comun-yellow bg-comun-yellow font-black uppercase text-comun-black md:col-span-2">
            Validar e avançar
          </button>
        </form>
      ) : null}

      <div className="mt-4 grid gap-2">
        <h3 className="font-black uppercase">Trilha de auditoria</h3>
        {cycle.events.map((event: any) => (
          <article
            key={event.id}
            className="border-l-4 border-comun-black bg-white p-3"
          >
            <p className="text-xs font-black uppercase">
              {event.from_stage} → {event.to_stage} · versão{" "}
              {event.state_version}
            </p>
            <p className="mt-1 text-sm">{event.public_summary}</p>
          </article>
        ))}
        {!cycle.events.length ? (
          <p className="border-2 border-comun-black bg-white p-3 text-sm">
            A primeira transição ainda não foi registrada.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Select({
  name,
  label,
  rows,
  value,
  rowLabel,
}: {
  name: string;
  label: string;
  rows: any[];
  value?: string | null;
  rowLabel: (row: any) => string;
}) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="min-h-11 border-2 border-comun-black px-2"
      >
        <option value="">Não vinculado</option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {rowLabel(row)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  name,
  label,
  dark = false,
}: {
  name: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase">
      {label}
      <input
        name={name}
        className={`min-h-11 border-2 px-3 ${
          dark
            ? "border-comun-yellow bg-comun-black text-comun-paper"
            : "border-comun-black"
        }`}
      />
    </label>
  );
}

function Area({
  name,
  label,
  dark = false,
}: {
  name: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-black uppercase md:col-span-2">
      {label}
      <textarea
        name={name}
        rows={3}
        className={`border-2 p-3 ${
          dark
            ? "border-comun-yellow bg-comun-black text-comun-paper"
            : "border-comun-black"
        }`}
      />
    </label>
  );
}
