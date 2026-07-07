import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/actions";

export function AdminShell({ children, adminEmail }: { children: ReactNode; adminEmail: string }) {
  return (
    <div className="min-h-screen bg-comun-paper text-comun-black">
      <header className="border-b-2 border-comun-black bg-comun-black text-comun-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/comun/admin" className="font-black uppercase text-comun-yellow">Admin COMUN</Link>
          <nav className="flex items-center gap-3 text-sm font-black uppercase">
            <Link href="/comun/admin/relatos">Relatos</Link>
            <Link href="/comun/admin/pautas">Pautas</Link>
            <Link href="/comun/admin/anexos">Anexos</Link>
            <Link href="/comun/admin/protocolos-oficiais">Protocolos oficiais</Link>
            <Link href="/comun/admin/auditoria">Auditoria</Link>
            <Link href="/comun/admin/observabilidade">Observabilidade</Link>
            <form action={logoutAdmin}><button className="text-comun-paper/70">Sair</button></form>
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
