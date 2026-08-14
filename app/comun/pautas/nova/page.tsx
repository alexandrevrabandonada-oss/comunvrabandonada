import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import { resolveCurrentPublicEvidenceReference } from "@/lib/comun-public-evidence-resolver";
import { isComunPautaLowFrictionCreationEnabled } from "@/lib/comun-pauta-low-friction";
import { PautaCreationForm } from "./pauta-creation-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewPautaPage({ searchParams }: { searchParams: Promise<{ evidencia?: string | string[] }> }) {
  if (!isComunPautaLowFrictionCreationEnabled()) notFound();
  const params = await searchParams;
  const evidenceRef = typeof params.evidencia === "string" ? params.evidencia : "";
  const [session, evidence] = await Promise.all([
    getCommunitySession(),
    evidenceRef ? resolveCurrentPublicEvidenceReference(evidenceRef) : Promise.resolve(null),
  ]);
  const returnTo = evidenceRef
    ? `/comun/pautas/nova?evidencia=${encodeURIComponent(evidenceRef)}`
    : "/comun/pautas/nova";

  return (
    <ComunShell appBar={{ title: "Começar uma pauta", contextLabel: "Pautas Vivas", backDestination: "/comun/pautas" }}>
      <Section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/65">Organização coletiva</p>
        <h1 className="mt-2 text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">Começar uma pauta</h1>
        <p className="comun-prose mt-3 max-w-2xl text-comun-paper/78">Escreva a questão agora. Categoria, território, comunidade, Roda e Ação podem ser organizados depois.</p>
        {evidenceRef && !evidence ? (
          <p role="status" className="mt-5 max-w-2xl border-l-4 border-comun-yellow p-3 text-sm text-comun-paper/80">A referência pública não está disponível e não será vinculada. Você ainda pode começar uma pauta sem ela.</p>
        ) : null}
        <div className="max-w-2xl">
          <PautaCreationForm authenticated={Boolean(session?.user)} loginHref={communityLoginHref(returnTo)} evidence={evidence} />
        </div>
      </Section>
    </ComunShell>
  );
}
