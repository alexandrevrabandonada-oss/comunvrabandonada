import { ComunShell, Section } from "@/components/comun-shell";
import { PhotoSubmissionForm } from "./photo-submission-form";
import { CulturalIntakeForm } from "./cultural-intake-form";
import { isComunCulturalSaveFirstIntakeEnabled } from "@/lib/comun-cultural-contribution-feature";
import { isComunCulturalProgressiveRightsEnabled } from "@/lib/comun-cultural-progressive-rights";
export const metadata = { title: "Guardar uma memória | Acervo Vivo" };
export default async function ContributePhotoPage({ searchParams }: { searchParams: Promise<{ specialized?: string; intake?: string }> }) {
  const params = await searchParams;
  const saveFirst = isComunCulturalSaveFirstIntakeEnabled();
  const specializedPhoto = params.specialized === "photo" && Boolean(params.intake);
  return (
    <ComunShell>
      <Section>
        <p className="font-black uppercase text-comun-yellow">Acervo Vivo</p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper">{saveFirst ? "Guardar uma memória" : "Compartilhe uma fotografia historica"}</h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          {saveFirst ? "Guardamos seu envio de forma privada. Antes de qualquer publicação, direitos e contexto serão verificados." : "Ajude a preservar a memoria de sua cidade. O original fica privado, e somente uma versao revisada pode ser publicada."}
        </p>
        <div className="mt-8">
          {saveFirst && !specializedPhoto ? <CulturalIntakeForm /> : <PhotoSubmissionForm progressiveRightsEnabled={isComunCulturalProgressiveRightsEnabled()} />}
        </div>
      </Section>
    </ComunShell>
  );
}
