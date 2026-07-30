import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { PautaPoliticalCycle } from "@/components/pauta-political-cycle";
import { pautaActionCyclePreviewFixture } from "@/lib/pauta-action-cycle-preview-fixture";
import { isCollectiveActionsPreviewFixturesEnabled } from "@/lib/collective-actions-release-contract";

export const dynamic = "force-dynamic";

export default function PoliticalCyclePreviewPage() {
  if (!isCollectiveActionsPreviewFixturesEnabled()) notFound();
  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          Fixture exclusiva de Preview
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow">
          Pauta: caminho seguro
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Jornada sintética sem dados reais, disponível apenas para testar
          leitura, teclado e responsividade antes da integração.
        </p>
      </Section>
      <PautaPoliticalCycle cycle={pautaActionCyclePreviewFixture} />
    </ComunShell>
  );
}
