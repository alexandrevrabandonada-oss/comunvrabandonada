import Link from "next/link";
import type { ReactNode } from "react";

export type ComunStateKind =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "reconnecting"
  | "blocked"
  | "waiting_person"
  | "completed"
  | "result"
  | "withdrawn";

const labels: Record<ComunStateKind, string> = {
  loading: "Carregando",
  empty: "Nada por aqui ainda",
  error: "Não foi possível carregar",
  offline: "Sem conexão",
  reconnecting: "Reconectando",
  blocked: "Bloqueado",
  waiting_person: "Aguardando pessoa",
  completed: "Concluído",
  result: "Resultado",
  withdrawn: "Retirado",
};

export function ComunStatePanel({
  state,
  children,
  actionHref,
  actionLabel,
  returnHref = "/comun",
  returnLabel = "Voltar ao início",
}: {
  state: ComunStateKind;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  returnHref?: string;
  returnLabel?: string;
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
      </div>
    </section>
  );
}
