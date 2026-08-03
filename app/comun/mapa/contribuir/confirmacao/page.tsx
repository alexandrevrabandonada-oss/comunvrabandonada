import Link from "next/link";
import { ComunJourneyConfirmation } from "@/components/comun-journey-confirmation";
import { ComunShell, Section } from "@/components/comun-shell";
import { ComunStatePanel } from "@/components/comun-state-panel";
import { requireCommunitySession } from "@/lib/community-auth";
import { safeCommunityReturn } from "@/lib/community-return";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  parseComunJourneyContext,
  withComunJourneyContext,
} from "@/lib/comun-journey-context";
import {
  getSidewalkOperationalRelease,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
} from "@/lib/sidewalk-operational-release";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Confirmation({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const appV2 = isComunAppV2(params.experiencia);
  const recordId =
    typeof params.registro === "string" ? params.registro : undefined;
  const returnTo = safeCommunityReturn(
    params.returnTo,
    "/comun/pautas/calcadas-em-circulacao",
  );
  const operational = await getSidewalkOperationalRelease();
  if (!operational.enabled)
    return (
      <ComunShell>
        <Section>
          <p
            role="status"
            className="mx-auto max-w-3xl border-l-4 border-comun-yellow bg-comun-paper p-5 text-comun-black"
          >
            {SIDEWALK_OPERATIONAL_PAUSED_MESSAGE}
          </p>
        </Section>
      </ComunShell>
    );
  const confirmationBase = `/comun/mapa/contribuir/confirmacao${recordId ? `?registro=${encodeURIComponent(recordId)}` : ""}`;
  const confirmationRoute = appV2
    ? withComunAppV2(
        withComunJourneyContext(confirmationBase, {
          ...parseComunJourneyContext(params),
          currentStage: "confirm",
        }),
      )
    : confirmationBase;
  const { user } = await requireCommunitySession(confirmationRoute);
  const db = createServiceSupabaseClient();
  const { data } =
    db && recordId
      ? await db
          .from("comun_sidewalk_records")
          .select("id,created_at")
          .eq("id", recordId)
          .eq("member_user_id", user.id)
          .maybeSingle()
      : { data: null };

  if (appV2) {
    const journey = parseComunJourneyContext(params);
    if (!data)
      return (
        <ComunShell>
          <div className="comun-v2-page comun-v2-page--reading">
            <ComunStatePanel
              state="error"
              actionHref={withComunAppV2(
                "/comun/minha-participacao?secao=contribuicoes",
              )}
              actionLabel="Abrir acompanhamentos"
            >
              Não encontramos um registro seu nesta confirmação. Nenhum dado de
              outra pessoa foi exibido.
            </ComunStatePanel>
          </div>
        </ComunShell>
      );
    return (
      <ComunShell>
        <ComunJourneyConfirmation
          title="Recebemos seu registro de calçada"
          status="Em revisão"
          whatHappened="A localização, a avaliação e a evidência foram recebidas."
          privacy="O registro é privado durante a revisão; fotografia e localização só aparecem depois da checagem."
          next="A equipe pode publicar, pedir complemento ou encerrar com justificativa."
          trackingHref={withComunAppV2(
            withComunJourneyContext(
              "/comun/minha-participacao?secao=contribuicoes",
              {
                ...journey,
                intent: "register_sidewalk",
                pautaSlug: "calcadas-em-circulacao",
                currentStage: "track",
              },
            ),
          )}
          trackingLabel="Ver em Minha área"
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

  return (
    <ComunShell>
      <Section>
        <div
          role="status"
          aria-live="polite"
          className="mx-auto max-w-3xl border-2 border-comun-yellow bg-comun-paper p-6 text-comun-black sm:p-8"
        >
          <div
            className="grid size-16 place-items-center rounded-full border-2 border-comun-black bg-comun-yellow text-3xl font-black"
            aria-hidden="true"
          >
            ✓
          </div>
          <p className="mt-5 text-xs font-black uppercase">
            Contribuição recebida
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none sm:text-5xl">
            Recebemos seu registro
          </h1>
          <p className="mt-4 inline-flex border-2 border-comun-black px-3 py-2 text-sm font-black uppercase">
            Estado: em revisão
          </p>
          <p className="mt-4 max-w-2xl">
            A revisão protege pessoas e confirma contexto, fotografia e
            localização antes de qualquer publicação. Recebido não significa
            problema resolvido.
          </p>
          {data ? (
            <p className="mt-5 border-l-4 border-comun-yellow pl-3">
              <strong>Próxima ação:</strong> acompanhar em Minha área.
            </p>
          ) : (
            <p role="alert" className="mt-5 border-l-4 border-comun-red pl-3">
              <strong>Não encontramos este registro.</strong> Abra Minha área
              para retomar com segurança.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/comun/minha-participacao"
              className="inline-flex min-h-12 items-center bg-comun-yellow px-4 font-black uppercase"
            >
              Ver em Minha área
            </Link>
            <Link
              href={returnTo}
              className="inline-flex min-h-12 items-center border-2 border-comun-black px-4 font-black uppercase"
            >
              Voltar à pauta
            </Link>
            <Link
              href="/comun/caixa-de-entrada"
              className="inline-flex min-h-12 items-center px-2 font-bold underline"
            >
              Abrir Caixa de entrada
            </Link>
          </div>
        </div>
      </Section>
    </ComunShell>
  );
}
