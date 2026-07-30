import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  COMUN_V1_LAUNCH_PROGRAM,
  summarizeComunLaunchProgram,
} from "../lib/comun-launch-program.ts";

const baseUrl = String(
  process.env.COMUN_PUBLIC_BASE_URL || "https://comunsocial.online",
).replace(/\/$/, "");
const artifactDir = resolve(
  process.env.COMUN_ARTIFACT_DIR || ".ci-artifacts/comun-launch-readiness",
);

const publicRoutes = [
  ["/comun", "COMUN"],
  ["/comun/pautas", "Pautas"],
  ["/comun/comunidades", "Comunidades"],
  ["/comun/participar", "Participar"],
  ["/comun/calcadas", "Mapa comunitário"],
  ["/comun/acervo", "Acervo"],
  ["/comun/radio", "Rádio"],
  ["/comun/observatorios", "Observatórios"],
  ["/comun/seguranca", "Segurança"],
];
const protectedRoutes = [
  "/comun/admin/lancamento",
  "/comun/admin/organizacao",
  "/comun/admin/calcadas/operacao",
];
const forbiddenPublicMarkers = [
  "placeholder",
  "conteúdo demonstrativo",
  "registros demonstrativos",
  "fixture",
  "lorem ipsum",
  "em construção",
];

async function readRoute(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "user-agent": "COMUN-launch-readiness/1.0" },
      redirect: "follow",
    });
    return {
      path,
      status: response.status,
      finalPath: new URL(response.url).pathname,
      headers: Object.fromEntries(response.headers.entries()),
      html: await response.text(),
    };
  } catch (error) {
    return {
      path,
      status: 0,
      finalPath: path,
      headers: {},
      html: "",
      error: error instanceof Error ? error.name : "request_error",
    };
  }
}

const publicResults = [];
for (const [path, expectedText] of publicRoutes) {
  const result = await readRoute(path);
  const lowerHtml = result.html.toLowerCase();
  publicResults.push({
    path,
    status: result.status,
    contractPresent: result.html.includes(expectedText),
    forbiddenMarkers: forbiddenPublicMarkers.filter((marker) =>
      lowerHtml.includes(marker),
    ),
  });
}

const protectedResults = [];
for (const path of protectedRoutes) {
  const result = await readRoute(path);
  protectedResults.push({
    path,
    status: result.status,
    redirectedToAdminLogin: result.finalPath === "/comun/admin/login",
  });
}

const home = await readRoute("/comun");
const manifest = await readRoute("/manifest.webmanifest");
const robots = await readRoute("/robots.txt");
const sitemap = await readRoute("/sitemap.xml");
const securityHeaders = {
  hsts: Boolean(home.headers["strict-transport-security"]),
  noSniff: home.headers["x-content-type-options"] === "nosniff",
  frameDenied:
    home.headers["x-frame-options"] === "DENY" ||
    String(home.headers["content-security-policy"] || "").includes(
      "frame-ancestors 'none'",
    ),
  referrerPolicy: Boolean(home.headers["referrer-policy"]),
  contentSecurityPolicy: Boolean(
    home.headers["content-security-policy"] ||
    home.headers["content-security-policy-report-only"],
  ),
};

const program = summarizeComunLaunchProgram();
const routeBlockers = publicResults.filter(
  (route) =>
    route.status !== 200 ||
    !route.contractPresent ||
    route.forbiddenMarkers.length > 0,
);
const protectionBlockers = protectedResults.filter(
  (route) => !route.redirectedToAdminLogin,
);
const assetBlockers = [
  ["manifest", manifest.status],
  ["robots", robots.status],
  ["sitemap", sitemap.status],
].filter(([, status]) => status !== 200);
const missingSecurityHeaders = Object.entries(securityHeaders)
  .filter(([, present]) => !present)
  .map(([name]) => name);
const findings = [
  ...routeBlockers.map((route) => `public_route:${route.path}`),
  ...protectionBlockers.map((route) => `protected_route:${route.path}`),
  ...assetBlockers.map(([name]) => `public_asset:${name}`),
  ...missingSecurityHeaders.map((name) => `security_header:${name}`),
  ...COMUN_V1_LAUNCH_PROGRAM.domains
    .filter((domain) => domain.status !== "green")
    .map((domain) => `launch_domain:${domain.id}:${domain.status}`),
];

const readyForFinalHumanGate =
  program.readyForFinalHumanGate && findings.length === 0;
const artifact = {
  schemaVersion: 1,
  auditedAt: new Date().toISOString(),
  baseUrl: new URL(baseUrl).origin,
  programVersion: COMUN_V1_LAUNCH_PROGRAM.version,
  result: readyForFinalHumanGate
    ? "COMUN_V1_DELIVERABILITY_READY_FOR_FINAL_HUMAN_GATE"
    : "COMUN_V1_DELIVERABILITY_AUDIT_BLOCKED",
  readyForFinalHumanGate,
  finalHumanGate: COMUN_V1_LAUNCH_PROGRAM.finalHumanGate,
  summary: program,
  publicRoutes: publicResults,
  protectedRoutes: protectedResults,
  publicAssets: {
    manifest: manifest.status,
    robots: robots.status,
    sitemap: sitemap.status,
  },
  securityHeaders,
  findings,
  findingsCount: findings.length,
  containsCoordinates: false,
  containsPersonalData: false,
  containsUserIds: false,
  containsSecrets: false,
  writes: {
    database: "none",
    storage: "none",
    auth: "none",
    deployment: "none",
  },
};

await mkdir(artifactDir, { recursive: true });
await writeFile(
  resolve(artifactDir, "comun-launch-readiness.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
const markdown = `# Entregabilidade V1 do COMUN

- Resultado: \`${artifact.result}\`
- Gate final liberado: **${readyForFinalHumanGate ? "sim" : "não"}**
- Domínios verdes: **${program.counts.green}/${program.total}**
- Findings: **${findings.length}**
- Rotas públicas com blocker: **${routeBlockers.length}**
- Rotas administrativas sem proteção esperada: **${protectionBlockers.length}**
- Assets públicos ausentes: **${assetBlockers.length}**
- Headers de segurança ausentes: **${missingSecurityHeaders.length}**

## Fronteira

Auditoria exclusivamente read-only. O artifact não contém coordenadas, dados pessoais, IDs de usuários, secrets ou caminhos privados.
`;
await writeFile(resolve(artifactDir, "comun-launch-readiness.md"), markdown);

console.log(JSON.stringify(artifact));
