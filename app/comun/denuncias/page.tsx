import Link from "next/link";
import { ComunShell } from "@/components/comun-shell";

export default function DenunciasPage() {
  return (
    <ComunShell
      appBar={{ title: "Denúncias e serviços públicos", contextLabel: "COMUN" }}
    >
      <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
        <p className="text-sm font-black uppercase tracking-wide">COMUN</p>
        <h1 className="text-4xl font-black">Tem um problema? Conta pra gente.</h1>
        <p className="text-lg leading-8">
          Você não precisa saber qual órgão procurar. Conte o que aconteceu e o
          COMUN ajuda a encontrar o próximo caminho.
        </p>
        <p className="border-l-4 border-comun-yellow bg-comun-paper p-4 text-lg font-black leading-7">
          Você conta o problema. O COMUN ajuda a descobrir o caminho. E, se
          outras pessoas estiverem passando pelo mesmo, vocês podem deixar de
          estar sozinhas.
        </p>
        <Link
          href="/comun/relatar"
          className="inline-flex min-h-12 w-fit items-center border-2 border-comun-black bg-comun-yellow px-5 py-3 font-black"
        >
          Contar o que aconteceu
        </Link>
        <section className="grid gap-3 border-2 border-comun-black bg-white p-4">
          <h2 className="text-xl font-black">Como funciona</h2>
          <ol className="grid list-decimal gap-2 pl-5">
            <li>Você conta o problema.</li>
            <li>O COMUN faz só as perguntas necessárias.</li>
            <li>Mostra o melhor caminho e o que guardar.</li>
          </ol>
          <p className="text-sm font-bold">
            Em risco imediato, procure o atendimento de emergência primeiro.
          </p>
        </section>
      </main>
    </ComunShell>
  );
}
