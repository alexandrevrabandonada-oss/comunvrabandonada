import { ComunShell, Section } from "@/components/comun-shell";
import { RadioContributionForm } from "./contribution-form";
import { isComunCulturalProgressiveRightsEnabled } from "@/lib/comun-cultural-progressive-rights";

export default function ContributePage() {
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-paper">
          Contribua com a Rádio
        </h1>
        <p className="mt-4 max-w-3xl text-comun-paper/80">
          O envio nasce privado e pendente. Nenhum áudio é publicado
          automaticamente.
        </p>
        <p className="mt-3 max-w-3xl text-comun-paper/80">
          Nesta fase piloto, a Rádio recebe áudios de até 45 MiB e 30 minutos
          nos formatos WAV, MP3, M4A, Ogg ou FLAC. Conteúdos maiores podem ser
          organizados em episódios ou partes.
        </p>
        <RadioContributionForm progressiveRightsEnabled={isComunCulturalProgressiveRightsEnabled()} />
      </Section>
    </ComunShell>
  );
}
