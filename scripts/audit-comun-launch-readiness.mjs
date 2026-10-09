import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  inspectManifest,
  inspectPilotRobots,
  inspectPilotSitemap,
  hasPilotNoindexHeader,
} from "./comun-launch-assets.mjs";
import { COMUN_INDEXING_POLICY } from "../lib/comun-indexing-policy.ts";
import {
  COMUN_V1_LAUNCH_PROGRAM,
  summarizeComunLaunchProgram,
} from "../lib/comun-launch-program.ts";

import {
  PUBLIC_PAGE_CONTRACTS,
  inspectPublicPage,
} from "./comun-public-page-contract.mjs";

const baseUrl = String(
  process.env.COMUN_PUBLIC_BASE_URL || "https://comunsocial.online",
).replace(/\/$/, "");
const artifactDir = resolve(
  process.env.COMUN_ARTIFACT_DIR || ".ci-artifacts/comun-launch-readiness",
);

const protectedRoutes = [
  "/comun/admin/lancamento",
  "/comun/admin/organizacao",
  "/comun/admin/calcadas/operacao",
];
async function readRoute(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "user-agent": "COMUN-launch-readiness/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
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
for (const [path, headings] of PUBLIC_PAGE_CONTRACTS) {
  const result = await readRoute(path);
  const contract = inspectPublicPage(result, headings);
  publicResults.push({
    path,
    status: result.status,
    contractPresent: contract.contractPresent,
    forbiddenMarkers: [
      ...new Set([
        ...contract.visibleMarkers,
        ...contract.unresolvedPayloadMarkers,
      ]),
    ],
    contract,
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
const routeBlockers = publicResults.filter((route) => !route.contract.valid);
const protectionBlockers = protectedResults.filter(
  (route) => !route.redirectedToAdminLogin,
);
const publicAssetContracts = {
  manifest: inspectManifest(manifest),
  robots: inspectPilotRobots(robots),
  sitemap: inspectPilotSitemap(sitemap),
};
const assetBlockers = Object.entries(publicAssetContracts).filter(
  ([, contract]) => !contract.valid,
);
const pilotNoindexConfirmed = hasPilotNoindexHeader(home.headers);
const missingSecurityHeaders = Object.entries(securityHeaders)
  .filter(([, present]) => !present)
  .map(([name]) => name);
const findings = [
  ...(pilotNoindexConfirmed ? [] : ["indexing_policy:missing_pilot_noindex"]),
  ...routeBlockers.map((route) => `public_route:${route.path}`),
  ...protectionBlockers.map((route) => `protected_route:${route.path}`),
  ...assetBlockers.map(([name]) => `public_asset:${name}`),
  ...missingSecurityHeaders.map((name) => `security_header:${name}`),
  ...(program.declaredReadyForFinalHumanGate
    ? ["launch_evidence:domain_verification_not_performed"]
    : []),
  ...COMUN_V1_LAUNCH_PROGRAM.domains
    .filter((domain) => domain.status !== "green")
    .map((domain) => `launch_domain:${domain.id}:${domain.status}`),
];

const readyForFinalHumanGate =
  program.readyForFinalHumanGate && findings.length === 0;
const artifact = {
  schemaVersion: 2,
  domainEvidenceSource: "declared_program_states",
  domainEvidenceVerification: program.domainEvidenceVerification,
  coverage: "nine_public_routes_three_anonymous_admin_redirects_assets_headers",
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
  publicAssetContracts,
  indexingPolicy: COMUN_INDEXING_POLICY,
  pilotNoindexConfirmed,
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

Estados dos domínios vêm do programa declarado; HTML não comprova direitos editoriais, testes humanos ou recuperação. A inspeção estrutural de nove rotas não cobre todas as páginas e APIs.

Prontidão declarada não libera o gate: a verificação das provas de domínio ainda não foi executada. Mesmo dez estados verdes mantêm o resultado bloqueado até existir verificador de evidências revisado.

Auditoria exclusivamente read-only. O artifact não contém coordenadas, dados pessoais, IDs de usuários, secrets ou caminhos privados.
`;
await writeFile(resolve(artifactDir, "comun-launch-readiness.md"), markdown);

console.log(JSON.stringify(artifact));
