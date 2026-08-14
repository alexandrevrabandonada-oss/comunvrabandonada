import { createHash } from "node:crypto";

export const COMUN_PAUTA_LOW_FRICTION_CREATION_FLAG =
  "COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED" as const;

export function isComunPautaLowFrictionCreationEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_PAUTA_LOW_FRICTION_CREATION_FLAG] === "enabled";
}

export function normalizePautaQuestion(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function derivePautaTitle(question: string, maxLength = 96) {
  const clean = question.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const firstSentence = clean.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 12 && firstSentence.length <= maxLength)
    return firstSentence;
  const clipped = clean.slice(0, maxLength + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, wordBoundary >= 12 ? wordBoundary : maxLength).trim();
}

export function derivePautaSlug(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : "pauta-coletiva";
}

export type PautaCreationSafety =
  | { allowed: true }
  | { allowed: false; publicReason: "personal_data" | "high_risk" | "automation" };

const EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const CPF = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-.\s]?\d{2}\b/;
const PHONE = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/;
const PRIVATE_URL_OR_TOKEN =
  /(?:https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|[?&](?:token|key|secret|password)=|\bbearer\s+[a-z0-9._~-]+|\beyJ[a-zA-Z0-9_-]{12,}\.)/i;
const HIGH_RISK =
  /\b(?:vou|quero|pretendo)\s+(?:me\s+)?(?:matar|ferir|machucar)|\b(?:abuso|explora[cç][aã]o)\s+(?:sexual\s+)?(?:de\s+)?(?:crian[cç]a|menor)\b/i;

export function assessLowFrictionPautaSafety(input: {
  question: string;
  honeypot?: string;
}): PautaCreationSafety {
  if (input.honeypot?.trim())
    return { allowed: false, publicReason: "automation" };
  if (EMAIL.test(input.question) || CPF.test(input.question) || PHONE.test(input.question) || PRIVATE_URL_OR_TOKEN.test(input.question))
    return { allowed: false, publicReason: "personal_data" };
  if (HIGH_RISK.test(input.question))
    return { allowed: false, publicReason: "high_risk" };
  return { allowed: true };
}

export function derivePautaCreationRequestKey(input: {
  userId: string;
  normalizedQuestion: string;
  secret: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const hour = now.toISOString().slice(0, 13);
  return createHash("sha256")
    .update(`comun-pauta-create-v1:${input.secret}:${input.userId}:${hour}:${input.normalizedQuestion}`)
    .digest("hex");
}
