import type { PrivacyClass, RelataInput } from "./comun-relata-contract";

const HIGH_RISK = /\b(criança|menor|ameaça|retaliação|vingança|violência|agressão|suicídio|autoagressão|documento|cpf|senha|doença|diagnóstico|nome completo)\b/i;
const SENSITIVE = /\b(casa|residência|apartamento|endereço|telefone|email|placa|escola|hospital|pessoa|vizinho)\b/i;

export function classifyRelataPrivacy(input: RelataInput): PrivacyClass {
  if (
    input.includesChildData ||
    input.includesHealthData ||
    input.includesThreatOrRetaliation ||
    HIGH_RISK.test(input.text)
  )
    return "high_risk";
  if (input.hasExactLocation || input.includesPersonData || input.hasAttachment)
    return "sensitive";
  if (SENSITIVE.test(input.text)) return "restricted";
  return input.text.trim().length >= 12
    ? "public_after_sanitization"
    : "public_safe";
}

export function requiresRelataSanitization(privacy: PrivacyClass) {
  return privacy !== "public_safe";
}

export function requiresRelataHumanReview(privacy: PrivacyClass) {
  return privacy === "restricted" || privacy === "sensitive" || privacy === "high_risk";
}

export function canRelataAutoRoute(privacy: PrivacyClass) {
  return privacy === "public_safe" || privacy === "public_after_sanitization";
}

export function canRelataConsiderForMap(privacy: PrivacyClass) {
  return privacy === "public_safe";
}

export function requiresRelataAdditionalConsent(privacy: PrivacyClass) {
  return privacy === "sensitive" || privacy === "high_risk";
}

export function sanitizeRelataSummary(text: string) {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[contato removido]")
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}\b/g, "[contato removido]")
    .replace(/\b(?:cpf|rg)\s*[:#-]?\s*[\d.\-]+\b/gi, "[documento removido]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}
