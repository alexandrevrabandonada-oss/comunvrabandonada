import Link from "next/link";
import { ComunShell } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunEmptyState,
  ComunSection,
  ComunStatus,
} from "@/components/comun-ui";
import { requireCommunitySession } from "@/lib/community-auth";
import { listMemberInbox } from "@/lib/community-inbox";
import { markInboxRead } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { user } = await requireCommunitySession("/comun/caixa-de-entrada"),
    rows: any[] = await listMemberInbox(user.id);
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[
            { label: "Início", href: "/comun" },
            { label: "Caixa de Entrada" },
          ]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Caixa de Entrada
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Atualizações operacionais e ações necessárias. Não é chat e não contém
          notificações de popularidade.
        </p>
        <div className="mt-7 grid gap-4">
          {rows.map((x) => (
            <article
              className={`border-2 p-5 ${x.read_at ? "border-comun-paper/25" : "border-comun-yellow"}`}
              key={x.id}
            >
              <div className="flex flex-wrap items-center gap-3">
                <ComunStatus>{x.priority}</ComunStatus>
                <span className="text-xs font-black uppercase text-comun-paper/60">
                  {x.notification_type.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-black">{x.title}</h2>
              <p className="mt-2 text-comun-paper/75">{x.summary}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  className="font-black uppercase text-comun-yellow underline"
                  href={x.action_url}
                >
                  {x.action_label}
                </Link>
                {!x.read_at ? (
                  <form action={markInboxRead}>
                    <input type="hidden" name="id" value={x.id} />
                    <button className="font-bold underline">
                      Marcar como lida
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!rows.length ? (
          <div className="mt-7">
            <ComunEmptyState
              href="/comun/minha-participacao"
              label="Ver sua participação"
            >
              Nenhuma ação precisa da sua atenção agora.
            </ComunEmptyState>
          </div>
        ) : null}
      </ComunSection>
    </ComunShell>
  );
}
