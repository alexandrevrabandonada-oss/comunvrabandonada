import "server-only";
import { cache } from "react";
import { getPublicPautaSpaceBySlug as readPauta } from "./pauta-spaces";
import { getPublicArchiveItem as readArchive } from "./archive";
import { getPublishedPautaDossierBySlug as readDossier } from "./pauta-dossiers";
import { getPublicCollectiveAction as readAction } from "./collective-actions";
import { getPublicObservatory as readObservatory } from "./observatories";
import { getPublicResult as readResult } from "./central-hub";
import { getCollectiveActionsRelease } from "./collective-actions-release";
import { isCollectiveActionsPreviewFixturesEnabled } from "./collective-actions-release-contract";
import { getPublicPracticeMaterial as readMaterial } from "./learning/public-practice-materials";
import { projectComunPublicSummary } from "./comun-one-product-contract";

// Request-scoped deduplication: page and metadata use the same authorized read,
// never a long-lived cache of content that may have been withdrawn.
export const getPublicPautaSpaceBySlug = cache(readPauta);
export const getPublicArchiveItem = cache(readArchive);
export const getPublishedPautaDossierBySlug = cache(readDossier);
export const getPublicCollectiveAction = cache(readAction);
export const getPublicObservatory = cache(async (slug: string) => {
  const result = await readObservatory(slug);
  return result && ["pilot", "active", "completed"].includes(result.o.status)
    ? result
    : null;
});
export const getPublicResult = cache(readResult);
export const getPublicPracticeMaterial = cache(readMaterial);

function publishedSummary(
  path: string,
  title?: string | null,
  summary?: string | null,
) {
  return projectComunPublicSummary(
    title && summary
      ? {
          title,
          summary,
          canonicalPath: path,
          publication: "published",
          privacy: "public",
        }
      : null,
  ).metadata;
}
export async function pautaMetadata(slug: string) {
  const row = await getPublicPautaSpaceBySlug(slug);
  return publishedSummary(
    `/comun/pautas/${row?.slug}`,
    row?.title,
    row?.summary,
  );
}
export async function actionMetadata(slug: string) {
  // Preview fixtures and a closed release are never advertised as publication.
  if (
    isCollectiveActionsPreviewFixturesEnabled() ||
    !(await getCollectiveActionsRelease()).enabled
  )
    return projectComunPublicSummary(null).metadata;
  const row = await getPublicCollectiveAction(slug);
  return publishedSummary(
    `/comun/acoes/${row?.slug}`,
    row?.title,
    row?.summary,
  );
}
export async function archiveMetadata(slug: string) {
  const row = await getPublicArchiveItem(slug);
  return publishedSummary(
    `/comun/acervo/${row?.slug}`,
    row?.title,
    row?.summary,
  );
}
export async function dossierMetadata(slug: string) {
  const row = await getPublishedPautaDossierBySlug(slug);
  const metadata = publishedSummary(
    `/comun/dossies/${row?.public_slug}`,
    row?.public_title,
    row?.public_summary,
  );
  if (row && metadata.other?.["comun:share"] === "public") {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: "article",
      publishedTime: row.published_at,
      modifiedTime: row.public_updated_at ?? row.published_at,
    };
  }
  return metadata;
}
export async function observatoryMetadata(slug: string) {
  const row = await getPublicObservatory(slug);
  return publishedSummary(
    `/comun/observatorios/${row?.o.slug}`,
    row?.o.title,
    row?.o.public_summary,
  );
}
export async function resultMetadata(slug: string) {
  const row = await getPublicResult(slug);
  return publishedSummary(
    `/comun/resultados/${row?.slug}`,
    row?.title,
    row?.public_summary,
  );
}
export async function materialMetadata(slug: string) {
  const row = getPublicPracticeMaterial(slug);
  return publishedSummary(
    `/comun/ajuda/praticas/${row?.id}`,
    row?.title,
    row?.concept,
  );
}
