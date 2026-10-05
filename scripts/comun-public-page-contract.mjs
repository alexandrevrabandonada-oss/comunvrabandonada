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

// React streams completed Suspense content into hidden S:n containers, then
// $RC moves their children into the B:n boundary. Inspect that final structure,
// without evaluating response JavaScript or accepting arbitrary hidden content.
function completeStreamedBoundaries(document) {
  const ids = new Map();
  const scripts = [];
  function collect(node) {
    const id = attr(node, "id");
    if (id) ids.set(id, ids.has(id) ? null : node);
    if (node.tagName === "script" && !attr(node, "src") && !attr(node, "type"))
      scripts.push(node);
    for (const child of node.childNodes || []) collect(child);
  }
  collect(document);
  let completed = 0;
  for (const script of scripts) {
    const code = (script.childNodes || [])
      .map((node) => node.value || "")
      .join("");
    // Only a standalone completion statement, never a string in a JSON/RSC
    // payload. Unknown transport shapes remain blocked for browser review.
    const call = /(?:^|;)\s*\$RC\("(B:\d+)","(S:\d+)"\)\s*;?\s*$/.exec(code);
    if (!call) continue;
    const boundary = ids.get(call[1]);
    const segment = ids.get(call[2]);
    if (
      boundary?.tagName !== "template" ||
      segment?.tagName !== "div" ||
      attr(segment, "hidden") === undefined ||
      !segment.parentNode
    )
      continue;
    const parent = boundary.parentNode;
    if (!parent) continue;
    const start = parent.childNodes.indexOf(boundary);
    const opening = parent.childNodes[start - 1];
    if (opening?.nodeName !== "#comment" || opening.data !== "$?") continue;
    let depth = 0;
    let end = -1;
    for (let index = start + 1; index < parent.childNodes.length; index++) {
      const node = parent.childNodes[index];
      if (node.nodeName !== "#comment") continue;
      if (["$", "$?", "$!"].includes(node.data)) depth++;
      if (node.data === "/$") {
        if (depth === 0) {
          end = index;
          break;
        }
        depth--;
      }
    }
    if (end === -1) continue;
    const children = segment.childNodes;
    for (const child of children) child.parentNode = parent;
    parent.childNodes.splice(start, end - start, ...children);
    opening.data = "$";
    segment.parentNode.childNodes.splice(
      segment.parentNode.childNodes.indexOf(segment),
      1,
    );
    segment.childNodes = [];
    completed++;
  }
  return completed;
}

export function inspectPublicPage(result, headings) {
  const html = String(result.html || "");
  const document = parse(html);
  // Preserve the original parsed payload for the independent leak scan below.
  const semanticDocument = parse(html);
  const completedStreamBoundaries =
    completeStreamedBoundaries(semanticDocument);
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
  walk(semanticDocument);
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
    inspection: completedStreamBoundaries
      ? "server_html_completed_stream_structure"
      : "server_html_structure",
    completedStreamBoundaries,
    contentProvenance: "not_verified_by_html",
    browserConfirmationRequired:
      !contractPresent || /id=["']S:|\$RC\(/.test(html),
  };
}
