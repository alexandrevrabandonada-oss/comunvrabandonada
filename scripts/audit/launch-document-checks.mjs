// Chromium is the repository's existing HTML/XML parser. The caller blocks network
// and disables page scripts; returned evidence contains labels, never page payloads.
const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const demoMarkers = [
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
const technicalExplanation = normalize(
  "Verificacoes tecnicas usam fixtures descartaveis, exigem acesso administrativo e nunca enviam segredos ou originais privados ao navegador.",
);

export async function inspectPublicDocument(page, result, expectedText) {
  await page.setContent(result.html, { waitUntil: "domcontentloaded" });
  const dom = await page.evaluate(() => {
    const visible = (element) => {
      for (let e = element; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (
          e.hidden ||
          e.getAttribute("aria-hidden") === "true" ||
          s.display === "none" ||
          s.visibility === "hidden" ||
          Number(s.opacity) === 0
        )
          return false;
      }
      return true;
    };
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const text = [];
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (
        parent &&
        !parent.closest("script,style,template,noscript") &&
        visible(parent)
      )
        text.push(walker.currentNode.textContent);
    }
    return {
      text: text.join(" "),
      demoOrigin: !!document.querySelector(
        '[data-fixture="true"],[data-content-origin="synthetic"],[data-content-origin="demo"]',
      ),
      decoded: document.documentElement.outerHTML,
    };
  });
  const text = normalize(dom.text);
  const expected = normalize(expectedText);
  const contractPresent =
    text.includes(expected) ||
    (result.path === "/comun/seguranca" &&
      text.includes("como o comun protege relatos"));
  // Only the exact existing explanatory sentence is exempt; other fixture text
  // and explicit synthetic origins still block. Attributes/CSS are not records.
  const editorial =
    result.path === "/comun/seguranca"
      ? text.replace(technicalExplanation, "")
      : text;
  const contentMarkers = demoMarkers.filter((marker) =>
    new RegExp(`\\b${normalize(marker)}(?:s)?\\b`).test(editorial),
  );
  const payload = (result.html + "\n" + dom.decoded)
    .replace(/\\u002f/gi, "/")
    .replace(/\\\//g, "/");
  const leakPatterns = [
    ["signed_storage_url", /\/storage\/v1\/object\/sign\//i],
    ["private_original_key", /(?:radio-originals|private-originals)\//i],
    [
      "credential",
      /\b(?:sb_secret_[a-z0-9_-]{20,}|eyJ[a-z0-9_-]{20,}\.[a-z0-9_-]{20,}\.[a-z0-9_-]{20,})\b/i,
    ],
    [
      "private_payload_field",
      /["'](?:contact_private|reviewer_notes_private|original_object_key|raw_report_text)["']\s*:\s*["'][^"']+/i,
    ],
  ];
  const payloadLeaks = leakPatterns
    .filter(([, re]) => re.test(payload))
    .map(([label]) => label);
  const originMarkers = dom.demoOrigin ? ["explicit_synthetic_origin"] : [];
  return {
    contractPresent,
    contentMarkers,
    originMarkers,
    payloadLeaks,
    forbiddenMarkers: [...contentMarkers, ...originMarkers, ...payloadLeaks],
    provenanceVerified: false,
    semanticScope:
      "server HTML with page scripts and subresource network disabled; not a human session",
  };
}

export async function inspectPublicAsset(page, kind, result, baseUrl) {
  if (result.status !== 200) return { valid: false, reason: "http_status" };
  if (kind === "robots") {
    if (/<\s*(?:!doctype|html|body)/i.test(result.html))
      return { valid: false, reason: "html_not_robots" };
    const directives = result.html
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean);
    const groups = [];
    let current = null;
    for (const line of directives) {
      const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) return { valid: false, reason: "invalid_directive" };
      const key = m[1].toLowerCase();
      if (key === "user-agent") {
        current = { agent: m[2], disallow: [], allow: [] };
        groups.push(current);
      } else if (["allow", "disallow"].includes(key)) {
        if (!current) return { valid: false, reason: "missing_agent" };
        current[key].push(m[2]);
      }
    }
    const all = groups.find((g) => g.agent === "*");
    const restricted = all?.disallow.includes("/");
    const protectedPaths = ["/comun/admin", "/api"];
    const protectedScope =
      all &&
      groups.every(
        (g) =>
          protectedPaths.every((p) =>
            g.disallow.some(
              (d) => d && (p === d.replace(/\/$/, "") || p.startsWith(d)),
            ),
          ) && g.allow.length === 0,
      );
    return {
      valid: !!protectedScope,
      reason: protectedScope ? "valid_policy" : "private_scope_not_protected",
      policy: restricted ? "restricted_pilot" : "public_with_exclusions",
    };
  }
  if (kind === "sitemap") {
    const parsed = await page.evaluate((xml) => {
      const d = new DOMParser().parseFromString(xml, "application/xml");
      return {
        invalid:
          !!d.querySelector("parsererror") ||
          !!d.doctype ||
          [...d.documentElement.children].some(
            (e) =>
              e.localName !== "url" ||
              e.getElementsByTagName("loc").length !== 1,
          ),
        root: d.documentElement.localName,
        namespace: d.documentElement.namespaceURI,
        locs: [...d.getElementsByTagName("loc")].map((e) => e.textContent),
      };
    }, result.html);
    if (
      parsed.invalid ||
      parsed.root !== "urlset" ||
      parsed.namespace !== "http://www.sitemaps.org/schemas/sitemap/0.9"
    )
      return { valid: false, reason: "invalid_sitemap_xml" };
    const origin = new URL(baseUrl).origin;
    const publicPath =
      /^\/comun(?:\/(?:pautas|comunidades|calcadas|acervo|radio|observatorios|seguranca)(?:\/[^/?#]+)?)?\/?$/;
    const valid = parsed.locs.every((value) => {
      try {
        const url = new URL(value);
        return (
          url.origin === origin &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          publicPath.test(url.pathname)
        );
      } catch {
        return false;
      }
    });
    return {
      valid,
      reason: valid ? "valid_public_scope" : "nonpublic_or_external_url",
      urlCount: parsed.locs.length,
    };
  }
  try {
    const value = JSON.parse(result.html);
    return {
      valid: !!value.name && Array.isArray(value.icons),
      reason: "manifest_shape",
    };
  } catch {
    return { valid: false, reason: "invalid_manifest_json" };
  }
}
