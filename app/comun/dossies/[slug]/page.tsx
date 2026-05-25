import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { getDossier } from "@/lib/comun-data";

export default async function DossierPage({ params }: { params: { slug: string } }) {
  const dossier = await getDossier(params.slug);
  if (!dossier) notFound();

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">{dossier.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-comun-paper/80">{dossier.executiveSummary}</p>
        <div className="paper-panel mt-6 border-2 border-comun-black p-5">
          <h2 className="font-black uppercase">Contexto</h2>
          <p className="mt-3 text-comun-asphalt/75">{dossier.contextText}</p>
          <h2 className="mt-6 font-black uppercase">Padroes iniciais</h2>
          <ul className="mt-3 grid gap-2">
            {dossier.patterns.map((pattern) => <li key={pattern} className="border-l-4 border-comun-yellow pl-3">{pattern}</li>)}
          </ul>
        </div>
      </Section>
    </ComunShell>
  );
}
