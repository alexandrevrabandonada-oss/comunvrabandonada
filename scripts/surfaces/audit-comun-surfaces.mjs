import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveComunSurfaceMigration } from "../../lib/comun-surface-migration.ts";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const pagesRoot = path.join(root, "app", "comun");
const reportRoot = path.join(root, "reports", "47.9a5");

const LEGACY_MARKERS = [
  ["paper-panel", /\bpaper-panel\b/],
  ["HubCard", /\bHubCard\b/],
  ["generic-white-panel", /\bbg-white\b/],
  ["legacy-shell", /\b(?:ComunShell|CommunShell)\b/],
];

const V2_MARKERS = [
  /\bisComunAppV2\b/,
  /\bComun(?:CollectionPage|EntityHeader|EmptyState|ContextTrail|RelationRail)\b/,
  /\b(?:AdminPage|InstitutionalPage|AuthPage|ImmersiveSurface|FilterBar|ErrorState|StatusSummary|PageActions)\b/,
  /data-comun-app-v2/,
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.name === "page.tsx") files.push(absolute);
  }
  return files;
}

function routeFromFile(file) {
  const relative = path.relative(pagesRoot, path.dirname(file));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));
  return `/comun${segments.length ? `/${segments.join("/")}` : ""}`;
}

function exportedComponent(source) {
  return (
    source.match(/export\s+default\s+(?:async\s+)?function\s+([\w$]+)/)?.[1] ??
    source.match(/export\s+default\s+([\w$]+)/)?.[1] ??
    "anonymous_page"
  );
}

function importedShell(source) {
  if (/\bComunOperationalShell\b/.test(source)) return "ComunOperationalShell";
  if (/\bAdminShell\b/.test(source)) return "AdminShell";
  if (/\b(?:ComunShell|CommunShell)\b/.test(source)) return "ComunShell";
  return "route_or_layout_shell";
}

function hasAny(source, patterns) {
  return patterns.some((pattern) => pattern.test(source));
}

function sourceFacts(source) {
  const legacyImports = LEGACY_MARKERS.filter(([, pattern]) =>
    pattern.test(source),
  ).map(([name]) => name);
  return {
    redirects:
      /\b(?:redirect|permanentRedirect|notFound)\s*\(/.test(source) ||
      /export\s*\{\s*default\s*\}\s*from\s*["'][^"']+["']/.test(source),
    explicitV2: hasAny(source, V2_MARKERS),
    notUserSurface:
      /export\s+default\s+function\s+\w+\s*\(.*\)\s*\{?\s*return\s+null/s.test(
        source,
      ),
    legacyImports,
  };
}

function visualState(decision, facts) {
  if (decision === "not_user_surface" || decision === "redirect_canonical")
    return "not_rendered";
  if (facts.explicitV2 && facts.legacyImports.length === 0) return "v2";
  if (facts.explicitV2) return "mixed";
  return "v2_compatibility";
}

function routeRow(file, source) {
  const route = routeFromFile(file);
  const facts = sourceFacts(source);
  const migration = resolveComunSurfaceMigration(route, facts);
  const shellComponent = importedShell(source);
  const hasTable = /<table\b|role=["']table["']/.test(source);
  const hasForm = /<form\b|action=\{/.test(source);
  const hasQueue =
    /\b(?:queue|fila|triage|rights|editorial|publication|withdrawal)/i.test(
      source,
    );
  const adminV2Contract =
    migration.shellMode === "admin" &&
    (shellComponent === "AdminShell" || facts.redirects);
  const severity = migration.legacyImports.length ? "P2" : "none";
  return {
    route,
    family: migration.family,
    shell_mode: migration.shellMode,
    public: ["public_web", "institutional"].includes(migration.shellMode),
    auth_required: ["member_root", "member_nested", "admin"].includes(
      migration.shellMode,
    ),
    visual_state: visualState(migration.decision, facts),
    main_component: exportedComponent(source),
    shell_component: shellComponent,
    legacy_components: migration.legacyImports,
    contextual_app_bar: ["member_nested", "immersive", "admin"].includes(
      migration.shellMode,
    ),
    primary_action: migration.primaryAction ?? null,
    empty_state: /\b(?:EmptyState|empty|vazio|nenhum|sem resultado)/i.test(
      source,
    ),
    requires_entity_context: migration.requiresEntityContext,
    preserves_filters_or_return:
      adminV2Contract ||
      /\b(?:searchParams|returnTo|withComunJourneyContext|filtro|filter)/.test(
        source,
      ),
    admin_domain: migration.shellMode === "admin" ? migration.family : null,
    admin_surface_type: hasQueue
      ? "queue"
      : hasTable
        ? "table"
        : hasForm
          ? "form"
          : migration.requiresEntityContext
            ? "detail"
            : "collection",
    has_table: hasTable,
    has_form: hasForm,
    accessible_table_contract: !hasTable || adminV2Contract,
    filter_return_contract: migration.shellMode !== "admin" || adminV2Contract,
    compatibility_severity: severity,
    compatibility_justification:
      severity === "P2"
        ? "Markup preservado para rollback; shell V2 neutraliza material legado e adiciona navegação, foco e semântica operacional."
        : null,
    decision: migration.decision,
    wave: migration.wave,
    source: path.relative(root, file).replaceAll(path.sep, "/"),
  };
}

function markdown(rows, summary) {
  const header = [
    "# Matriz canônica de superfícies — 47.9A5",
    "",
    `Gerada em: ${summary.generated_at}`,
    "",
    `Total: **${summary.total}** · ondas: ${Object.entries(summary.by_wave)
      .map(([wave, count]) => `${wave}=${count}`)
      .join(" · ")}`,
    "",
    "| Rota | Família | Shell | Visual | Componente | Decisão | Onda |",
    "| --- | --- | --- | --- | --- | --- | ---: |",
  ];
  return `${header
    .concat(
      rows.map(
        (row) =>
          `| \`${row.route}\` | ${row.family} | ${row.shell_mode} | ${row.visual_state} | ${row.main_component} | ${row.decision} | ${row.wave} |`,
      ),
    )
    .join("\n")}\n`;
}

export async function auditComunSurfaces({ write = true } = {}) {
  const files = (await walk(pagesRoot)).sort();
  const rows = [];
  for (const file of files)
    rows.push(routeRow(file, await readFile(file, "utf8")));
  rows.sort((left, right) => left.route.localeCompare(right.route));
  const duplicateRoutes = rows
    .map((row) => row.route)
    .filter((route, index, all) => all.indexOf(route) !== index);
  const summary = {
    generated_at: new Date().toISOString(),
    total: rows.length,
    duplicate_routes: [...new Set(duplicateRoutes)],
    shell_modes: Object.fromEntries(
      [...new Set(rows.map((row) => row.shell_mode))]
        .sort()
        .map((mode) => [
          mode,
          rows.filter((row) => row.shell_mode === mode).length,
        ]),
    ),
    by_wave: Object.fromEntries(
      [1, 2, 3, 4].map((wave) => [
        wave,
        rows.filter((row) => row.wave === wave).length,
      ]),
    ),
    by_decision: Object.fromEntries(
      [...new Set(rows.map((row) => row.decision))]
        .sort()
        .map((decision) => [
          decision,
          rows.filter((row) => row.decision === decision).length,
        ]),
    ),
    legacy_rendered: rows.filter(
      (row) => row.visual_state === "legacy_rendered",
    ).length,
    p2_p3_compatibility_debt: rows.filter(
      (row) =>
        row.decision === "compatibility_v2" && row.legacy_components.length > 0,
    ).length,
    p0_p1: rows.filter((row) =>
      ["P0", "P1"].includes(row.compatibility_severity),
    ).length,
    admin_wave3: rows.filter((row) => row.wave === 3).length,
    admin_wave4: rows.filter((row) => row.wave === 4).length,
    admin_tables: rows.filter(
      (row) => row.shell_mode === "admin" && row.has_table,
    ).length,
    admin_forms: rows.filter(
      (row) => row.shell_mode === "admin" && row.has_form,
    ).length,
  };
  const compatibilityDebt = rows
    .filter(
      (row) =>
        row.decision === "compatibility_v2" && row.legacy_components.length > 0,
    )
    .map((row) => ({
      code: `A5-P2-${row.wave}-${row.route
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toUpperCase()}`,
      severity: "P2",
      route: row.route,
      components: row.legacy_components,
      justification:
        "O fallback mantém o markup; sob App V2 o shell substitui material, forma e ritmo por família sem duplicar a árvore interativa.",
      deadline: "47.9D após ensaio humano, antes de tornar App V2 padrão",
    }));
  if (write) {
    await mkdir(reportRoot, { recursive: true });
    await writeFile(
      path.join(reportRoot, "surface-matrix.json"),
      `${JSON.stringify({ summary, routes: rows }, null, 2)}\n`,
    );
    await writeFile(
      path.join(reportRoot, "surface-matrix.md"),
      markdown(rows, summary),
    );
    await writeFile(
      path.join(reportRoot, "compatibility-debt.json"),
      `${JSON.stringify(compatibilityDebt, null, 2)}\n`,
    );
    await writeFile(
      path.join(reportRoot, "admin-surface-matrix.json"),
      `${JSON.stringify(
        {
          summary: {
            wave3: summary.admin_wave3,
            wave4: summary.admin_wave4,
            tables: summary.admin_tables,
            forms: summary.admin_forms,
            p0_p1: summary.p0_p1,
          },
          routes: rows.filter((row) => row.shell_mode === "admin"),
        },
        null,
        2,
      )}\n`,
    );
  }
  return { summary, routes: rows };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await auditComunSurfaces();
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  if (result.summary.duplicate_routes.length) process.exitCode = 1;
  if (result.summary.legacy_rendered > 0) process.exitCode = 1;
  if (result.summary.p0_p1 > 0) process.exitCode = 1;
}
