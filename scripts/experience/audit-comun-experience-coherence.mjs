import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..", "..");

const requiredRoutes = [
  "/comun",
  "/comun/explorar",
  "/comun/buscar",
  "/comun/busca",
  "/comun/territorios",
  "/comun/comunidades",
  "/comun/pautas",
  "/comun/pautas/[slug]",
  "/comun/acoes",
  "/comun/resultados",
  "/comun/protocolo-popular",
  "/comun/calcadas",
  "/comun/acervo",
  "/comun/radio",
  "/comun/arte",
  "/comun/seguranca",
  "/comun/ajuda",
  "/comun/entrar",
  "/comun/minha-participacao",
  "/comun/caixa-de-entrada",
  "/comun/conta",
  "/comun/admin",
  "/comun/admin/operacao",
  "/comun/admin/pautas",
  "/comun/admin/comunidades",
  "/comun/admin/calcadas",
  "/comun/admin/acervo",
  "/comun/admin/radio",
  "/comun/admin/auditoria",
  "/comun/admin/observabilidade",
  "/comun/admin/lancamento",
];

async function walk(directory) {
  const rows = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...(await walk(absolute)));
    else rows.push(absolute);
  }
  return rows;
}

function toRoute(root, pageFile) {
  return path
    .relative(path.join(root, "app"), path.dirname(pageFile))
    .split(path.sep)
    .filter(Boolean)
    .reduce((route, part) => `${route}/${part}`, "");
}

function staticComunLinks(source) {
  const links = new Set();
  for (const match of source.matchAll(
    /["'`](\/comun(?:\/[A-Za-z0-9À-ÿ._~?=&%#[\]{}$+-]+)*)["'`]/g,
  )) {
    const href = match[1];
    if (!href.includes("${")) links.add(href.split("?")[0].split("#")[0]);
  }
  return [...links].sort();
}

function assert(check, message, findings) {
  if (!check) findings.push(message);
}

export async function auditExperience(root = defaultRoot) {
  const pageFiles = (await walk(path.join(root, "app", "comun"))).filter(
    (file) => file.endsWith(`${path.sep}page.tsx`),
  );
  const routes = pageFiles.map((file) => toRoute(root, file)).sort();
  const routeSet = new Set(routes);
  const findings = [];
  const edges = [];

  for (const file of pageFiles) {
    const source = await readFile(file, "utf8");
    const from = toRoute(root, file);
    for (const to of staticComunLinks(source)) edges.push({ from, to });
  }

  for (const route of requiredRoutes) {
    assert(routeSet.has(route), `required_route_missing:${route}`, findings);
  }

  const [
    alias,
    navigation,
    appShell,
    styles,
    constitution,
    routeInventory,
    home,
    pauta,
    pautaShell,
    central,
  ] = await Promise.all([
    readFile(path.join(root, "app/comun/busca/page.tsx"), "utf8"),
    readFile(path.join(root, "components/comun-navigation.tsx"), "utf8"),
    readFile(path.join(root, "components/comun-app-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/globals.css"), "utf8"),
    readFile(path.join(root, "docs/comun-experience-coherence.md"), "utf8"),
    readFile(path.join(root, "docs/comun-experience-routes.md"), "utf8"),
    readFile(path.join(root, "app/comun/page.tsx"), "utf8"),
    readFile(path.join(root, "app/comun/pautas/[slug]/page.tsx"), "utf8"),
    readFile(path.join(root, "components/pauta-app-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/comun/admin/operacao/page.tsx"), "utf8"),
  ]);

  assert(
    alias.includes("permanentRedirect") && alias.includes("/comun/buscar"),
    "search_alias_not_permanent",
    findings,
  );
  assert(
    !`${navigation}\n${appShell}`.includes('href="/comun/admin'),
    "admin_route_exposed_in_public_navigation",
    findings,
  );
  assert(
    styles.includes("prefers-reduced-motion") &&
      styles.includes("prefers-contrast: more"),
    "accessibility_fallback_missing",
    findings,
  );
  assert(
    [
      "--comun-color-ink",
      "--comun-color-action",
      "--comun-space-4",
      "--comun-motion-standard",
    ].every((token) => styles.includes(token)),
    "fundamental_tokens_missing",
    findings,
  );
  assert(
    !styles.includes("backdrop-filter"),
    "blur_became_functional_dependency",
    findings,
  );
  assert(
    (constitution.match(/^\d+\. /gm) ?? []).length >= 15,
    "experience_constitution_incomplete",
    findings,
  );
  assert(
    constitution.includes("47.8A — Redundância Durável Independente") &&
      constitution.includes("47.9B — Busca Viva") &&
      constitution.includes("47.9C — Acessibilidade"),
    "roadmap_sequence_missing",
    findings,
  );
  assert(
    routeInventory.includes("**188 páginas**"),
    "route_inventory_count_not_recorded",
    findings,
  );
  for (const [name, source, level] of [
    ["home", home, "level={2}"],
    ["pauta", pauta, "level={1}"],
    ["central", central, "level={0}"],
  ]) {
    assert(
      source.includes("ComunExperiencePilot") && source.includes(level),
      `pilot_surface_missing:${name}`,
      findings,
    );
  }
  assert(
    home.includes('data-comun-primary-action="true"'),
    "home_primary_action_not_declared",
    findings,
  );
  assert(
    pauta.includes("ComunContextTrail") && pautaShell.includes("returnTo"),
    "pauta_context_or_return_missing",
    findings,
  );
  assert(
    central.includes("Voltar à administração") && central.includes("returnTo"),
    "central_return_contract_missing",
    findings,
  );

  const outgoingRoutes = new Set(edges.map(({ from }) => from));
  const incomingRoutes = new Set(
    edges.map(({ to }) => to).filter((route) => routeSet.has(route)),
  );
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result:
      findings.length === 0
        ? "COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL"
        : "COMUN_EXPERIENCE_COHERENCE_BLOCKED_CONTRACT",
    humanUsabilityRehearsal: "required",
    routeInventory: {
      totalPages: routes.length,
      requiredRoutes: requiredRoutes.length,
      missingRequiredRoutes: findings.filter((item) =>
        item.startsWith("required_route_missing:"),
      ).length,
      staticEdges: edges.length,
      routesWithoutStaticOutgoingLink: routes.filter(
        (route) => !outgoingRoutes.has(route),
      ).length,
      routesWithoutStaticIncomingLink: routes.filter(
        (route) => !incomingRoutes.has(route) && route !== "/comun",
      ).length,
      knownCompatibleRedirects: 1,
    },
    pilots: { total: 3, levels: [0, 1, 2] },
    findings,
  };

  return report;
}

async function main() {
  const report = await auditExperience();
  if (process.argv.includes("--write-report")) {
    const outputDir = path.join(
      defaultRoot,
      ".ci-artifacts",
      "experience-coherence",
    );
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, "coherence.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      { mode: 0o600 },
    );
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.findings.length) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main();
}
