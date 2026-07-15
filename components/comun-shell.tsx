import Link from "next/link";
import type { ReactNode } from "react";
import { Shield } from "lucide-react";

const nav = [
  ["Inicio", "/comun"],
  ["Pautas", "/comun/pautas"],
  ["Acoes", "/comun/acoes"],
  ["Participar", "/comun/participar"],
  ["Mapa", "/comun/mapa"],
  ["Territorios", "/comun/territorios"],
  ["Projetos", "/comun/projetos"],
  ["Acervo", "/comun/acervo"],
];
const mobileNav=[nav[0],nav[1],nav[2],nav[4]];

export function ComunShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b-2 border-comun-black bg-comun-black/95 text-comun-paper backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/comun"
            className="max-w-[12rem] text-sm font-black uppercase leading-tight tracking-wide text-comun-yellow sm:max-w-none sm:text-base"
          >
            COMUN VR ABANDONADA
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-bold md:flex">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="text-comun-paper/85 hover:text-comun-yellow">
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/comun/relatar"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-none bg-comun-yellow px-4 text-sm font-black uppercase text-comun-black md:inline-flex"
          >
            <Shield size={17} />
            Relatar
          </Link>
        </div>
        <div className="border-t border-comun-paper/10 px-4 py-2 md:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs font-bold uppercase text-comun-paper/75">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {mobileNav.map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-comun-yellow">
                  {label}
                </Link>
              ))}
            </div>
            <Link href="/comun/relatar" className="text-comun-yellow">
              Relatar
            </Link>
          </div>
        </div>
      </header>
      <main className="pb-28 md:pb-0">{children}</main>
      <footer className="border-t-2 border-comun-black bg-comun-asphalt px-4 py-10 text-comun-paper">
        <div className="mx-auto max-w-6xl">
          <p className="text-xl font-black uppercase text-comun-yellow">COMUN VR ABANDONADA</p>
          <p className="mt-2 text-sm text-comun-paper/75">Escutar. Cuidar. Organizar.</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold"><Link href="/comun/mapa">Mapa Popular</Link><Link href="/comun/reciclagem">Reciclagem</Link><Link href="/comun/cooperativas">Cooperativas</Link><Link href="/comun/territorio-tomado">Território Tomado</Link><Link href="/comun/busca">Busca</Link><Link href="/comun/resultados">Resultados</Link><Link href="/comun/projetos">Projetos</Link><Link href="/comun/acervo">Acervo</Link></div>
        </div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-comun-black bg-comun-paper/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/comun/relatar"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase text-comun-black shadow-[4px_4px_0_#0b0b0a]"
          >
            <Shield size={17} />
            Enviar relato
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-4 py-8 sm:py-12 ${className}`}>{children}</section>;
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center border-2 border-comun-black bg-comun-yellow px-5 py-3 text-center text-sm font-black uppercase leading-tight text-comun-black shadow-[4px_4px_0_#0b0b0a]"
    >
      {children}
    </Link>
  );
}
