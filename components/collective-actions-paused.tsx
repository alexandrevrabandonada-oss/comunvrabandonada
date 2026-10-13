import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { COLLECTIVE_ACTIONS_PAUSED_MESSAGE } from "@/lib/collective-actions-release-contract";

export function CollectiveActionsPaused() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Ações coletivas
        </h1>
        <p
          role="status"
          className="mt-5 max-w-3xl border-l-4 border-comun-yellow bg-comun-paper/5 p-5 text-lg"
        >
          {COLLECTIVE_ACTIONS_PAUSED_MESSAGE}
        </p>
        <nav
          aria-label="Próximos caminhos"
          className="mt-5 flex flex-wrap gap-3"
        >
          <Link
            href="/comun/pautas"
            className="inline-flex min-h-11 items-center border-2 border-comun-paper/40 px-4 py-2 font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Ver pautas em andamento
          </Link>
          <Link
            href="/comun/participar"
            className="inline-flex min-h-11 items-center border-2 border-comun-paper/40 px-4 py-2 font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Outras formas de participar
          </Link>
        </nav>
      </Section>
    </ComunShell>
  );
}
