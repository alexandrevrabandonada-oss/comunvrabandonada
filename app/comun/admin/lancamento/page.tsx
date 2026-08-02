import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  COMUN_V1_LAUNCH_PROGRAM,
  summarizeComunLaunchProgram,
  type ComunLaunchDomainStatus,
} from "@/lib/comun-launch-program";
import { COMUN_ADMIN_PLATFORM_GATES } from "@/lib/comun-admin-platform-contract";

export const dynamic = "force-dynamic";

const statusLabels: Record<ComunLaunchDomainStatus, string> = {
  green: "Verde",
  in_progress: "Em fechamento",
  blocked: "Bloqueado",
  evidence_required: "Falta evidência",
};

export default async function ComunLaunchReadinessPage() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const summary = summarizeComunLaunchProgram();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-yellow">
            Tijolo 47.1 · programa de entregabilidade
          </p>
          <h1 className="text-3xl font-black uppercase">
            Lançamento integral do COMUN
          </h1>
          <p className="mt-2 max-w-3xl">
            Esta é a fonte única de verdade da V1. O sistema avança por domínios
            e só apresenta o gate humano de lançamento quando todos estiverem
            verdes.
          </p>
        </div>
        <Link className="btn" href="/comun">
          Abrir experiência pública
        </Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Domínios" value={String(summary.total)} />
        <Metric label="Verdes" value={String(summary.counts.green)} />
        <Metric
          label="Em fechamento"
          value={String(summary.counts.inProgress)}
        />
        <Metric label="Restantes" value={String(summary.remaining)} attention />
      </section>

      <section
        className="mt-7 border-2 border-comun-yellow bg-comun-black p-5 text-white"
        data-human-gate={COMUN_ADMIN_PLATFORM_GATES.launch.gate}
        data-human-gate-state={COMUN_ADMIN_PLATFORM_GATES.launch.state}
      >
        <h2 className="text-xl font-black uppercase">Política do lançamento</h2>
        <p className="mt-2 max-w-4xl">{COMUN_V1_LAUNCH_PROGRAM.policy}</p>
        <p className="mt-3 text-sm text-white/75">
          Gate humano final:{" "}
          <code>{COMUN_V1_LAUNCH_PROGRAM.finalHumanGate}</code>. Não existem
          autorizações humanas intermediárias para diagnósticos, correções
          reversíveis, testes, PRs ou deployments verdes.
        </p>
        <p className="mt-2 text-sm font-black text-comun-yellow">
          Gate fechado: esta tela não executa lançamento.
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        {COMUN_V1_LAUNCH_PROGRAM.domains.map((domain, index) => (
          <article
            className="grid gap-4 border-2 border-comun-black bg-white p-5 text-comun-black lg:grid-cols-[12rem_1fr_auto]"
            key={domain.id}
          >
            <div>
              <p className="text-xs font-black uppercase">
                Domínio {index + 1}
              </p>
              <Status status={domain.status} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase">{domain.label}</h2>
              <p className="mt-2">{domain.objective}</p>
              <h3 className="mt-4 text-sm font-black uppercase">
                Evidências obrigatórias
              </h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {domain.requiredEvidence.map((evidence) => (
                  <li key={evidence}>— {evidence}</li>
                ))}
              </ul>
              <p className="mt-4 border-l-4 border-comun-yellow pl-3 font-bold">
                {domain.nextTijolo}
              </p>
            </div>
            <div className="flex items-start lg:justify-end">
              {domain.href ? (
                <Link className="btn" href={domain.href}>
                  Abrir domínio
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 border-l-4 border-comun-yellow bg-comun-paper p-5 text-comun-black">
        <h2 className="text-xl font-black uppercase">Resultado atual</h2>
        <p className="mt-2 font-bold">
          {summary.readyForFinalHumanGate
            ? COMUN_V1_LAUNCH_PROGRAM.finalResult
            : "COMUN_V1_DELIVERABILITY_IN_PROGRESS"}
        </p>
        <p className="mt-2">
          O lançamento integral permanece fechado. O Mapa das Calçadas continua
          operando dentro do piloto já autorizado, sem converter automaticamente
          o restante da plataforma em lançamento público.
        </p>
      </section>
    </AdminShell>
  );
}

function Status({ status }: { status: ComunLaunchDomainStatus }) {
  return (
    <span
      className={`mt-2 inline-flex border-2 px-3 py-2 text-xs font-black uppercase ${
        status === "green"
          ? "border-emerald-700 bg-emerald-100"
          : status === "blocked"
            ? "border-comun-red bg-red-100"
            : "border-comun-yellow bg-yellow-100"
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div
      className={`border-2 bg-white p-4 text-comun-black ${
        attention ? "border-comun-yellow" : "border-comun-black"
      }`}
    >
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
