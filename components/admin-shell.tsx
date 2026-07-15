import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/actions";
import { getAdminNotificationSummary } from "@/lib/admin-notifications";

export async function AdminShell({
  children,
  adminEmail,
}: {
  children: ReactNode;
  adminEmail: string;
}) {
  const notificationSummary = await getAdminNotificationSummary();
  return (
    <div className="min-h-screen overflow-x-hidden bg-comun-paper text-comun-black">
      <header className="border-b-2 border-comun-black bg-comun-black text-comun-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/comun/admin"
            className="font-black uppercase text-comun-yellow"
          >
            Admin COMUN
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-black uppercase">
            <Link href="/comun/admin/organizacao">Organizacao</Link>
            <Link href="/comun/admin/organizacao/entrada/vincular">Vincular relato</Link>
            <Link href="/comun/admin/relatos">Relatos</Link>
            <Link href="/comun/admin/pautas">Pautas</Link>
            <Link href="/comun/admin/pautas/contribuicoes">Contribuicoes</Link>
            <Link href="/comun/admin/dossies">Dossies</Link>
            <Link href="/comun/admin/acervo">Acervo</Link>
            <Link href="/comun/admin/acervo/contribuicoes">
              Fotos recebidas
            </Link>
            <Link href="/comun/admin/acervo/sugestoes">Sugestoes</Link>
            <Link href="/comun/admin/acervo/colecoes">Colecoes</Link>
            <Link href="/comun/admin/acervo/storage">Storage</Link>
            <Link href="/comun/admin/acervo/processamento">Processamento</Link>
            <Link href="/comun/admin/alertas">Alertas</Link>
            <Link href="/comun/dossies">Publicos</Link>
            <Link href="/comun/admin/dossies/revisoes">Revisoes</Link>
            <Link
              href="/comun/admin/notificacoes"
              className="inline-flex items-center gap-1"
            >
              Notificacoes
              <span className="border border-comun-yellow px-1 text-[10px] text-comun-yellow">
                {notificationSummary.unread}
              </span>
              {notificationSummary.overdue ? (
                <span className="border border-red-400 px-1 text-[10px] text-red-200">
                  {notificationSummary.overdue}
                </span>
              ) : null}
              {notificationSummary.urgent ? (
                <span className="border border-orange-300 px-1 text-[10px] text-orange-200">
                  {notificationSummary.urgent}
                </span>
              ) : null}
            </Link>
            <Link href="/comun/admin/anexos">Anexos</Link>
            <Link href="/comun/admin/protocolos-oficiais">
              Protocolos oficiais
            </Link>
            <Link href="/comun/admin/equipe">Equipe</Link>
            <Link href="/comun/admin/auditoria">Auditoria</Link>
            <Link href="/comun/admin/observabilidade">Observabilidade</Link>
            <form action={logoutAdmin}>
              <button className="text-comun-paper/70">Sair</button>
            </form>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-3 text-xs font-bold uppercase text-comun-paper/70">
          <span>Area interna - dados sensiveis</span>
          <span>{adminEmail}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
