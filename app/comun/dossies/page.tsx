import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { dossiers } from "@/lib/seed-data";

export default function DossiersPage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">Dossies</h1>
        <p className="mt-3 max-w-2xl text-comun-paper/75">Area preparada para organizar memoria coletiva em documentos publicos, sempre com relatos sanitizados.</p>
        <div className="mt-6 grid gap-4">
          {dossiers.map((dossier) => (
            <Link key={dossier.slug} href={`/comun/dossies/${dossier.slug}`} className="paper-panel border-2 border-comun-black p-4">
              <h2 className="text-xl font-black uppercase">{dossier.title}</h2>
              <p className="mt-2 text-sm text-comun-asphalt/75">{dossier.executiveSummary}</p>
            </Link>
          ))}
        </div>
      </Section>
    </ComunShell>
  );
}
