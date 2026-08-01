import Link from "next/link";
import type { ReactNode } from "react";

export type ComunStateKind =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "reconnecting"
  | "permission_denied"
  | "session_expired"
  | "blocked"
  | "waiting_person"
  | "waiting_institution"
  | "completed"
  | "result"
  | "withdrawn"
  | "archived";

const labels: Record<ComunStateKind, string> = {
  loading: "Carregando",
  empty: "Nada por aqui ainda",
  error: "Não foi possível carregar",
  offline: "Sem conexão",
  reconnecting: "Reconectando",
  permission_denied: "Sem permissão",
  session_expired: "Sessão encerrada",
  blocked: "Bloqueado",
  waiting_person: "Aguardando pessoa",
  waiting_institution: "Aguardando instituição",
  completed: "Concluído",
  result: "Resultado",
  withdrawn: "Retirado",
  archived: "Arquivado",
};

export function ComunStatePanel({
  state,
  children,
  actionHref,
  actionLabel,
  returnHref = "/comun",
  returnLabel = "Voltar ao início",
  helpHref = "/comun/ajuda",
}: {
  state: ComunStateKind;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  returnHref?: string;
  returnLabel?: string;
  helpHref?: string;
}) {
  const live = ["loading", "error", "offline", "reconnecting"].includes(state);
  return (
    <section
      className={`rounded-[var(--comun-radius-card)] border-2 p-5 ${state === "error" || state === "blocked" ? "surface-alert" : state === "completed" || state === "result" ? "surface-result" : "surface-paper"}`}
      data-comun-state={state}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
      aria-busy={state === "loading" || state === "reconnecting" || undefined}
    >
      <p className="comun-v2-status">{labels[state]}</p>
      <div className="mt-2 text-sm">{children}</div>
      <div className="mt-4 flex flex-wrap gap-4">
        {actionHref && actionLabel ? (
          <Link className="comun-v2-action" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
        <Link
          className="inline-flex min-h-11 items-center font-black underline"
          href={returnHref}
        >
          {returnLabel}
        </Link>
        {helpHref !== returnHref ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-black underline"
            href={helpHref}
          >
            Ajuda
          </Link>
        ) : null}
      </div>
    </section>
  );
}
