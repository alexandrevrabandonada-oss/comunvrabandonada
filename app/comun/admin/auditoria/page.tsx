import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listComunAdminAuditLogSanitized } from "@/lib/admin-audit";
import { COMUN_SECURITY_RESILIENCE } from "@/lib/comun-security-resilience";
import { COMUN_ADMIN_PLATFORM_GATES } from "@/lib/comun-admin-platform-contract";

export const dynamic = "force-dynamic";

const label = (status: string) =>
  status === "ready"
    ? "Pronto"
    : status === "blocked"
      ? "Bloqueado pela capacidade atual"
      : "Evidência pendente";

const auditLabel = (value: string | null, fallback: string) =>
  value && /^[a-z0-9_:-]{1,80}$/i.test(value) ? value : fallback;

export default async function AdminAuditPage() {
  await requireComunAdmin({ roles: ["admin"] });
  const events = await listComunAdminAuditLogSanitized(20);

  return (
    <AdminShell adminEmail="Sessão administrativa">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase">Segurança e continuidade</p>
        <h1 className="text-3xl font-black">A plataforma pode se recuperar?</h1>
        <p className="mt-2">
          Estado sanitizado de acesso, backup, recuperação, retenção e
          incidentes. Detalhes privados permanecem fora desta tela.
        </p>
      </header>

      <section
        className="mt-6 border-2 border-comun-black bg-white p-4"
        aria-labelledby="security-state"
        data-platform-blocker="durable-recovery"
        data-platform-state={COMUN_ADMIN_PLATFORM_GATES.durableRecovery.state}
      >
        <h2 id="security-state" className="text-xl font-black">
          {COMUN_SECURITY_RESILIENCE.state}
        </h2>
        <p className="mt-2">{COMUN_SECURITY_RESILIENCE.nextAction}</p>
        <p className="mt-2 text-sm">
          Evidência versionada em {COMUN_SECURITY_RESILIENCE.evidenceAt}.
        </p>
        <p className="mt-2 text-xs font-bold">
          Redundância durável segue bloqueada pela capacidade atual do provider.
        </p>
        <Link
          href="/comun/admin/operacao"
          className="mt-4 inline-block border-2 border-comun-black bg-comun-yellow px-4 py-2 font-black"
        >
          Voltar à Central Operacional
        </Link>
      </section>

      <section
        className="mt-6 grid gap-3 sm:grid-cols-2"
        aria-label="Controles de segurança e recuperação"
      >
        {COMUN_SECURITY_RESILIENCE.checks.map(([name, status]) => (
          <article
            key={name}
            className="border-2 border-comun-black bg-white p-4"
          >
            <h2 className="font-black">{name}</h2>
            <p className="mt-1">{label(status)}</p>
          </article>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="recent-audit">
        <h2 id="recent-audit" className="text-xl font-black">
          Atividade administrativa recente
        </h2>
        <p className="mt-1 text-sm">
          Somente ação, tipo de superfície e horário. Pessoas, alvos e payloads
          não aparecem aqui.
        </p>
        <ul className="mt-3 grid gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="border-2 border-comun-black bg-white p-3"
            >
              <strong>
                {auditLabel(event.action, "atividade_administrativa")}
              </strong>
              <span className="ml-2">
                {auditLabel(event.target_type, "plataforma")} ·{" "}
                {new Date(event.created_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {!events.length ? (
            <li className="border-2 border-comun-black bg-white p-3">
              Nenhum evento sanitizado recente.
            </li>
          ) : null}
        </ul>
      </section>
    </AdminShell>
  );
}
