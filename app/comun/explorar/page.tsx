import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";

const categories = [
  ["Territórios", "Onde os processos acontecem.", "/comun/territorios"],
  ["Comunidades", "Quem acompanha e organiza.", "/comun/comunidades"],
  ["Pautas", "Problemas, propostas e próximos passos.", "/comun/pautas"],
  ["Ferramentas", "Como agir em processos concretos.", "/comun/calcadas"],
  ["Resultados", "O que mudou e como foi verificado.", "/comun/resultados"],
  ["Acervo", "O que permanece na memória coletiva.", "/comun/acervo"],
] as const;

export default function ExplorarPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Explorar
        </h1>
        <p className="mt-3 max-w-2xl text-comun-paper/75">
          Encontre um lugar, um grupo, um problema, uma ferramenta ou uma
          memória.
        </p>
        <form
          action="/comun/buscar"
          className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]"
        >
          <label className="sr-only" htmlFor="explorar-q">
            Buscar no COMUN
          </label>
          <input
            id="explorar-q"
            name="q"
            className="min-h-12 border-2 border-comun-paper bg-white px-3 text-comun-black"
            placeholder="Território, comunidade, pauta…"
          />
          <button className="min-h-12 border-2 border-comun-yellow px-5 font-black uppercase text-comun-yellow">
            Buscar
          </button>
        </form>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {categories.map(([title, description, href]) => (
            <Link
              key={href}
              href={href}
              aria-label={title}
              className="min-h-28 border-2 border-comun-yellow p-5 focus:outline focus:outline-4 focus:outline-comun-paper"
            >
              <strong className="text-xl uppercase text-comun-yellow">
                {title}
              </strong>
              <span className="mt-2 block text-sm text-comun-paper/75">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
