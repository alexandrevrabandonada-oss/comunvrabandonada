export type PublicContentCandidate = {
  slug?: string | null;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  published_at?: string | null;
};

const forbiddenSlugFragments = ["smoke-", "fixture-", "test-fixture"];
const forbiddenEditorialMarkers = [
  "fotografia smoke",
  "teste controlado",
  "foto privada de registro de calçada",
  "imagem aguardando revisão de privacidade",
  "conteúdo sintético",
  "conteudo sintetico",
];

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inspectPublicContentReadiness(
  candidate: PublicContentCandidate,
) {
  const reasons: string[] = [];
  const slug = normalize(candidate.slug);
  const editorialText = normalize(
    [candidate.title, candidate.summary, candidate.description]
      .filter(Boolean)
      .join(" "),
  );

  if (candidate.status != null && candidate.status !== "published")
    reasons.push("status_not_published");
  if (candidate.visibility != null && candidate.visibility !== "public")
    reasons.push("visibility_not_public");
  if ("published_at" in candidate && !candidate.published_at)
    reasons.push("published_at_missing");
  if (forbiddenSlugFragments.some((fragment) => slug.includes(fragment)))
    reasons.push("technical_slug");
  if (
    forbiddenEditorialMarkers.some((marker) =>
      editorialText.includes(normalize(marker)),
    )
  )
    reasons.push("technical_editorial_metadata");

  return { deliverable: reasons.length === 0, reasons };
}

export function isPublicContentDeliverable(candidate: PublicContentCandidate) {
  return inspectPublicContentReadiness(candidate).deliverable;
}
