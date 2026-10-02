import { parse } from "parse5";

export const PUBLIC_PAGE_CONTRACTS = [
  ["/comun", ["O que precisa de atenção?", "COMUN"]],
  ["/comun/pautas", ["Pautas", "Pautas Vivas"]],
  ["/comun/comunidades", ["Comunidades"]],
  ["/comun/participar", ["Como você quer contribuir?"]],
  ["/comun/calcadas", ["Calçadas de Volta Redonda"]],
  ["/comun/acervo", ["Acervo vivo", "Memória viva da cidade"]],
  ["/comun/radio", ["Rádio Comunitária"]],
  ["/comun/observatorios", ["Observatórios"]],
  ["/comun/seguranca", ["Como o COMUN protege relatos"]],
];

export const FORBIDDEN_PUBLIC_MARKERS = [
  "placeholder",
  "conteúdo demonstrativo",
  "registros demonstrativos",
  "ambiente de demonstração",
  "conteúdo sintético",
  "fotografia smoke",
  "teste controlado",
  "foto privada de registro de calçada",
  "imagem aguardando revisão de privacidade",
  "fixture",
  "lorem ipsum",
  "página em construção",
];

// Reviewed, static policy copy, scoped to its actual source route. This is not
// an allowlist for fixture data. Any other occurrence remains a finding.
export const SECURITY_TEST_POLICY =
  "Verificacoes tecnicas usam fixtures descartaveis, exigem acesso administrativo e nunca enviam segredos ou originais privados ao navegador.";

const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const matches = (text) =>
  FORBIDDEN_PUBLIC_MARKERS.filter((marker) =>
    normalize(text).includes(normalize(marker)),
  );
const attr = (node, name) =>
  node.attrs?.find((item) => item.name === name)?.value;
const excluded = (node) =>
  ["script", "style", "template"].includes(node.tagName) ||
  attr(node, "hidden") !== undefined ||
  attr(node, "aria-hidden") === "true" ||
  /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(
    attr(node, "style") || "",
  );

function semanticText(node) {
  if (excluded(node)) return "";
  if (node.nodeName === "#text") return node.value;
  const alternatives = ["aria-label", "alt", "title", "placeholder"].map(
    (name) => attr(node, name) || "",
  );
  return [...alternatives, ...(node.childNodes || []).map(semanticText)].join(
    " ",
  );
}

export function inspectPublicPage(result, headings) {
  const html = String(result.html || "");
  const document = parse(html);
  const mainNodes = [],
    headingNodes = [];
  function walk(node, inMain = false) {
    if (excluded(node)) return;
    const main =
      inMain || node.tagName === "main" || attr(node, "role") === "main";
    if (main && !inMain) mainNodes.push(node);
    if (main && node.tagName === "h1") headingNodes.push(node);
    for (const child of node.childNodes || []) walk(child, main);
  }
  walk(document);
  const text = mainNodes.map(semanticText).join(" ");
  const knownPolicy =
    result.path === "/comun/seguranca" &&
    normalize(text).includes(normalize(SECURITY_TEST_POLICY));
  const policyScopedText = knownPolicy
    ? text.replaceAll(SECURITY_TEST_POLICY, "")
    : text;

  // Keep scanning the full response, including scripts, comments and hidden
  // payloads. Only syntax tokens (not attribute values) and exact reviewed
  // policy copy are classified as known explanations.
  let payload = html
    .replace(/\bplaceholder\s*=/gi, "input-hint=")
    .replace(/(?:\\?\")placeholder(?:\\?\")\s*:/gi, '"input-hint":')
    .replace(/\bplaceholder:/gi, "css-state:");
  if (knownPolicy) payload = payload.replaceAll(SECURITY_TEST_POLICY, "");
  // Escaping a marker in JSON must not hide a data leak from this scan.
  payload = payload.replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  // Decode HTML entities in text, comments and attribute values, including
  // hidden payloads. Class syntax is excluded only from this additional scan;
  // the raw response scan above still checks it.
  const decodedValues = [];
  function collect(node) {
    if (node.value || node.data) decodedValues.push(node.value || node.data);
    for (const item of node.attrs || []) {
      if (!["class", "style"].includes(item.name))
        decodedValues.push(item.value);
    }
    for (const child of node.childNodes || []) collect(child);
    if (node.content) collect(node.content);
  }
  collect(document);
  let decodedPayload = decodedValues
    .join(" ")
    .replace(/(?:\\?\")placeholder(?:\\?\")\s*:/gi, '"input-hint":');
  if (knownPolicy)
    decodedPayload = decodedPayload.replaceAll(SECURITY_TEST_POLICY, "");
  const reasons = [];
  if (result.status !== 200) reasons.push("http_status");
  if (
    !String(result.headers?.["content-type"] || "")
      .toLowerCase()
      .startsWith("text/html")
  )
    reasons.push("content_type");
  const contractPresent =
    mainNodes.length > 0 &&
    headingNodes.some((node) =>
      headings.some(
        (expected) => normalize(semanticText(node)) === normalize(expected),
      ),
    );
  if (!contractPresent) reasons.push("main_heading_contract");
  const visibleMarkers = matches(policyScopedText);
  const unresolvedPayloadMarkers = [
    ...new Set([...matches(payload), ...matches(decodedPayload)]),
  ];
  if (visibleMarkers.length) reasons.push("semantic_content_markers");
  if (unresolvedPayloadMarkers.length) reasons.push("payload_marker_review");
  return {
    contractPresent,
    valid: reasons.length === 0,
    reasons,
    visibleMarkers,
    payloadMarkers: matches(html),
    unresolvedPayloadMarkers,
    knownPolicyExplanation: knownPolicy,
    inspection: "server_html_structure",
    contentProvenance: "not_verified_by_html",
    browserConfirmationRequired:
      !contractPresent || /id=["']S:|\$RC\(/.test(html),
  };
}
