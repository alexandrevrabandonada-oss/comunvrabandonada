import { ComunJourneyConfirmation } from "@/components/comun-journey-confirmation";
import { ComunShell } from "@/components/comun-shell";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  parseComunJourneyContext,
  withComunJourneyContext,
} from "@/lib/comun-journey-context";
import { safeCommunityReturn } from "@/lib/community-return";
import { redirect } from "next/navigation";
import {
  COMUN_LEGACY_EXPERIENCE,
  withComunExperience,
} from "@/lib/comun-experience";

export default async function ParticipationConfirmation({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo, "/comun/pautas");
  if (!isComunAppV2(params.experiencia)) {
    redirect(
      withComunExperience(
        `/comun/participar?status=recebido&returnTo=${encodeURIComponent(returnTo)}`,
        COMUN_LEGACY_EXPERIENCE,
      ),
    );
  }
  const journey = parseComunJourneyContext(params);
  const tracking = withComunAppV2(
    withComunJourneyContext("/comun/minha-participacao?secao=contribuicoes", {
      ...journey,
      currentStage: "track",
    }),
  );
  return (
    <ComunShell>
      <ComunJourneyConfirmation
        title="Recebemos sua contribuição"
        status="Em revisão"
        whatHappened="O envio foi registrado no processo escolhido."
        privacy="Nada é publicado automaticamente; a equipe revisa contexto e dados pessoais."
        next="Uma decisão ou pedido de complemento aparecerá na Caixa e no acompanhamento."
        trackingHref={tracking}
        returnHref={withComunAppV2(returnTo)}
        returnLabel="Voltar à pauta"
        correctionHref={withComunAppV2(
          withComunJourneyContext("/comun/acervo/direitos-e-remocao", {
            ...journey,
            intent: "request_correction",
            currentStage: "participate",
          }),
        )}
      />
    </ComunShell>
  );
}
