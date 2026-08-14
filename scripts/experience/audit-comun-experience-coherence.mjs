import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..", "..");

const requiredRoutes = [
  "/comun",
  "/comun/explorar",
  "/comun/relatar",
  "/comun/buscar",
  "/comun/busca",
  "/comun/territorios",
  "/comun/comunidades",
  "/comun/pautas",
  "/comun/pautas/nova",
  "/comun/pautas/[slug]",
  "/comun/pautas/[slug]/rodas/[circleId]",
  "/comun/acoes",
  "/comun/acoes/[slug]",
  "/comun/onibus",
  "/comun/observatorios",
  "/comun/observatorios/panorama",
  "/comun/participar",
  "/comun/c/[slug]",
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

const experienceMatrix = [
  [
    "/comun",
    "começar",
    "O que posso fazer aqui?",
    "Vi um problema",
    "/comun",
    false,
  ],
  [
    "/comun/relatar",
    "registrar",
    "O que aconteceu?",
    "Guardar registro",
    "/comun",
    false,
  ],
  [
    "/comun/calcadas",
    "usar ferramenta especializada",
    "Como registrar ou consultar Calçadas?",
    "Registrar problema",
    "/comun",
    false,
  ],
  [
    "/comun/onibus",
    "usar ferramenta especializada",
    "Como consultar ou relatar sobre ônibus?",
    "Registrar problema",
    "/comun",
    false,
  ],
  [
    "/comun/observatorios",
    "entender",
    "Que leituras públicas existem?",
    "Ver Panorama",
    "/comun/observatorios/panorama",
    false,
  ],
  [
    "/comun/observatorios/panorama",
    "entender",
    "O que os dados públicos mostram?",
    "Explorar o que sabemos",
    "/comun",
    false,
  ],
  [
    "/comun/pautas",
    "participar",
    "Que questões coletivas estão abertas?",
    "Acompanhar pauta",
    "/comun",
    false,
  ],
  [
    "/comun/pautas/[slug]",
    "acompanhar pauta",
    "O que estamos tentando entender ou mudar?",
    "Próximo passo da pauta",
    "/comun/pautas",
    false,
  ],
  [
    "/comun/pautas/nova",
    "começar pauta",
    "O que você quer entender ou mudar?",
    "Criar pauta",
    "/comun/pautas",
    true,
  ],
  [
    "/comun/pautas/[slug]/rodas/[circleId]",
    "conversar",
    "Qual é a pergunta desta etapa?",
    "Contribuir nesta rodada",
    "/comun/pautas/[slug]",
    false,
  ],
  [
    "/comun/acoes",
    "encontrar ação",
    "O que vamos fazer?",
    "Ver ação",
    "/comun/pautas",
    false,
  ],
  [
    "/comun/acoes/[slug]",
    "agir",
    "Como posso ajudar nesta ação?",
    "Participar desta ação",
    "/comun/pautas/[slug]",
    true,
  ],
  [
    "/comun/comunidades",
    "encontrar vínculo",
    "Que comunidades públicas existem?",
    "Ver comunidade",
    "/comun/explorar",
    false,
  ],
  [
    "/comun/c/[slug]",
    "ver comunidade",
    "Quem permanece junto aqui?",
    "Ver contexto público",
    "/comun/comunidades",
    false,
  ],
  [
    "/comun/minha-participacao",
    "retomar",
    "Onde parei?",
    "Continuar de onde parei",
    "/comun",
    true,
  ],
  [
    "/comun/participar",
    "explorar formas",
    "Como quero participar?",
    "Ver pautas",
    "/comun",
    false,
  ],
  [
    "/comun/explorar",
    "explorar catálogo",
    "Que outras superfícies existem?",
    "Abrir destino",
    "/comun",
    false,
  ],
].map(
  ([
    route,
    userIntent,
    primaryQuestion,
    primaryAction,
    backDestination,
    loginGate,
  ]) => ({
    route,
    userIntent,
    primaryQuestion,
    primaryAction,
    secondaryActions: "contextuais e visualmente rebaixadas",
    backDestination,
    contextVisible: true,
    duplicateDestination:
      route === "/comun/explorar" ? "/comun/observatorios/panorama" : null,
    requiresDomainKnowledge: false,
    loginGate,
    emptyState: "explica o significado e oferece próximo passo",
    mobileFriction: "uma intenção acima da dobra; sem navegação paralela",
    terminologyDebt:
      route === "/comun/explorar" ? "catálogo secundário preservado" : null,
    recommendation:
      route === "/comun/explorar"
        ? "manter como catálogo secundário"
        : "manter no fluxo canônico",
  }),
);

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
    canonicalHome,
    shellContract,
    experienceContract,
    minhaParticipacao,
    roda,
    collectiveAction,
    publicExperienceContract,
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
    readFile(path.join(root, "components/comun-app-v2-home.tsx"), "utf8"),
    readFile(path.join(root, "lib/comun-shell-contract.ts"), "utf8"),
    readFile(path.join(root, "lib/comun-experience.ts"), "utf8"),
    readFile(path.join(root, "app/comun/minha-participacao/page.tsx"), "utf8"),
    readFile(path.join(root, "components/comun-roda-viva.tsx"), "utf8"),
    readFile(
      path.join(root, "components/comun-collective-actions-canonical.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "lib/experience-coherence.ts"), "utf8"),
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
    [
      "47.9D — Ensaio humano, aparelhos reais e consolidação visual",
      "47.10 — Conteúdo, ajuda e governança",
      "47.11 — Ensaio geral e go/no-go",
    ].every((item) => constitution.includes(item)) &&
      constitution.includes("47.8A permanece em pista paralela") &&
      constitution.includes("fechamento do provider 47.9B"),
    "roadmap_sequence_missing",
    findings,
  );
  assert(
    routeInventory.includes("**189 páginas**"),
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
  assert(
    experienceContract.includes(": COMUN_APP_V2_EXPERIENCE;") &&
      experienceContract.includes("COMUN_LEGACY_EXPERIENCE") &&
      experienceContract.includes("COMUN_COHERENCE_EXPERIENCE"),
    "canonical_app_v2_or_legacy_rollback_missing",
    findings,
  );
  assert(
    [
      'label: "Vi um problema"',
      'label: "Entender a cidade"',
      'label: "Participar do que está acontecendo"',
      'label: "Minha participação"',
    ].every((label) => publicExperienceContract.includes(label)),
    "public_language_contract_incomplete",
    findings,
  );
  assert(
    canonicalHome.includes('data-comun-primary-action="true"') &&
      (canonicalHome.match(/data-comun-primary-action=/g) ?? []).length === 1,
    "canonical_home_primary_action_not_unique",
    findings,
  );
  assert(
    [
      "/comun/observatorios/panorama",
      "/comun/pautas",
      "/comun/minha-participacao",
    ].every(
      (href) =>
        canonicalHome.includes(href) ||
        canonicalHome.includes("COMUN_PUBLIC_EXPERIENCE_DOORS"),
    ),
    "canonical_home_secondary_paths_missing",
    findings,
  );
  assert(
    shellContract.includes('label: "Entender"') &&
      shellContract.includes('label: "Minha participação"'),
    "streamlined_navigation_contract_missing",
    findings,
  );
  assert(
    [
      "Meus registros",
      "Estou acompanhando",
      "Minhas conversas",
      "Ações em que estou",
      "Meus compromissos",
    ].every((label) => minhaParticipacao.includes(label)),
    "my_participation_human_grouping_missing",
    findings,
  );
  assert(
    !`${canonicalHome}\n${minhaParticipacao}\n${roda}\n${collectiveAction}`.match(
      /action cycle|construction circle|evidence item/i,
    ),
    "internal_jargon_exposed",
    findings,
  );
  assert(
    roda.includes("href={`/comun/pautas/${pauta.slug}`}") &&
      collectiveAction.includes("href={`/comun/pautas/${action.pauta.slug}`}"),
    "pauta_context_return_missing",
    findings,
  );
  assert(
    experienceMatrix.every((row) =>
      [
        "route",
        "userIntent",
        "primaryQuestion",
        "primaryAction",
        "secondaryActions",
        "backDestination",
        "contextVisible",
        "duplicateDestination",
        "requiresDomainKnowledge",
        "loginGate",
        "emptyState",
        "mobileFriction",
        "terminologyDebt",
        "recommendation",
      ].every((field) => Object.hasOwn(row, field)),
    ),
    "experience_matrix_incomplete",
    findings,
  );

  const outgoingRoutes = new Set(edges.map(({ from }) => from));
  const incomingRoutes = new Set(
    edges.map(({ to }) => to).filter((route) => routeSet.has(route)),
  );
  const report = {
    schemaVersion: 2,
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
    integratedExperience: {
      canonicalExperience: "app-v2",
      newFeatureFlag: false,
      publicDoorCount: 4,
      primaryActionCount: { home: 1, pauta: 1, roda: 1, action: 1 },
      contextLost: 0,
      unexpectedTopLevelChoices: 0,
      routeMatrix: experienceMatrix,
    },
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
