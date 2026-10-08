import {
  getPublicPracticeMaterial,
  materialMetadata,
} from "@/lib/comun-public-sharing";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { ComunBreadcrumbs, ComunSection } from "@/components/comun-ui";
import { isComunAppV2 } from "@/lib/comun-experience";
import {
  participationGuidanceHref,
  resolveParticipationGuidanceStage,
} from "@/lib/comun-practice-guidance";
import { isLearningEnabled, missionHref } from "@/lib/learning/core";
import { materialsForGuidance } from "@/lib/learning/public-practice-materials";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return materialMetadata((await params).slug);
}

export default async function PracticeMaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const material = getPublicPracticeMaterial(slug);
  if (!material) notFound();
  const appV2 = isComunAppV2(query.experiencia);
  const candidate = resolveParticipationGuidanceStage(query.etapa);
  const stage =
    candidate &&
    materialsForGuidance(candidate).some((item) => item.id === material.id)
      ? candidate
      : null;
  const returnHref = participationGuidanceHref(stage ?? "pauta", appV2);

  return (
    <ComunShell publicReadOnlyFallback>
      <ComunSection>
        <ComunBreadcrumbs
          items={[
            { label: "Orientação", href: returnHref },
            { label: "Material de consulta" },
          ]}
        />
        <article data-comun-public-practice-material={material.id}>
          <p className="text-sm font-bold">Material público de consulta</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {material.title}
          </h1>
          <p className="mt-4 max-w-3xl">{material.concept}</p>
          <h2 className="mt-6 text-xl font-black">Como aplicar na prática</h2>
          <p className="mt-3 max-w-3xl">{material.application}</p>
          <p className="mt-5 max-w-3xl text-sm">
            Você pode usar este material para conferir uma pauta ou ação. A
            leitura não registra progresso, conclui formação ou assume uma
            tarefa.
          </p>
          <p className="mt-3 text-sm">
            Fonte: {material.programTitle} · {material.editor} · Versão{" "}
            {material.version}. Revisão informada no catálogo:{" "}
            <time dateTime={material.reviewedAt}>{material.reviewedAt}</time>.
          </p>
          <Link
            href={returnHref}
            prefetch={false}
            className="mt-5 inline-flex min-h-11 items-center font-black underline underline-offset-4"
          >
            Voltar à orientação
          </Link>
          {isLearningEnabled() ? (
            <div
              className="mt-6 border-l-4 border-comun-yellow p-4"
              data-comun-school-practice-entry
            >
              <p>
                Na Escola, você pode fazer a atividade interativa. O progresso e
                a prática usam sua conta e os fluxos existentes.
              </p>
              <Link
                href={missionHref(material.id)}
                prefetch={false}
                className="mt-3 inline-flex min-h-11 items-center font-black underline"
              >
                Abrir atividade na Escola
              </Link>
            </div>
          ) : null}
        </article>
      </ComunSection>
    </ComunShell>
  );
}
