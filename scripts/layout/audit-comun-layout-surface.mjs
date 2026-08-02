import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const css = readFileSync(resolve(root, "app/comun-app-v2.css"), "utf8");
const contract = readFileSync(
  resolve(root, "lib/comun-layout-surface-contract.ts"),
  "utf8",
);
const matrix = JSON.parse(
  readFileSync(resolve(root, "reports/47.9a5/surface-matrix.json"), "utf8"),
);

const tokens = [
  "--comun-text-primary",
  "--comun-text-secondary",
  "--comun-text-muted",
  "--comun-text-action",
  "--comun-surface-page",
  "--comun-surface-card",
  "--comun-bottom-nav-effective-height",
];
const classes = [
  ".comun-text-primary",
  ".comun-text-secondary",
  ".comun-text-muted",
  ".comun-text-action",
  ".comun-surface-page",
  ".comun-surface-card",
];
const shells = [
  "public_web",
  "member_root",
  "member_nested",
  "auth",
  "institutional",
  "immersive",
  "admin",
];

const missing = [
  ...tokens.filter((token) => !css.includes(token) || !contract.includes(token)),
  ...classes.filter((className) => !css.includes(className)),
  ...shells.filter((shell) => !contract.includes(`${shell}:`)),
];
const bridgeChecks = [
  '[class~="text-comun-paper"]',
  '[class~="text-white"]',
  '[class~="text-comun-yellow"]',
  '[class*="placeholder:text-comun-paper"]',
  '[class*="border-comun-paper"]',
  '[data-comun-contrast-surface="dark"]',
];
missing.push(...bridgeChecks.filter((selector) => !css.includes(selector)));

const summary = matrix.summary ?? {};
if (summary.total !== 189) missing.push(`matrix.total=${summary.total}`);
if (summary.unknown_routes !== 0)
  missing.push(`matrix.unknown_routes=${summary.unknown_routes}`);
if (summary.legacy_rendered !== 0)
  missing.push(`matrix.legacy_rendered=${summary.legacy_rendered}`);
if (Object.keys(summary.shell_modes ?? {}).length !== 7)
  missing.push("matrix.shell_modes");

const residualUtilities = matrix.routes.reduce(
  (total, route) => {
    const source = readFileSync(resolve(root, route.source), "utf8");
    return (
      total +
      (source.match(/text-(?:comun-paper|white|comun-black|comun-yellow)/g)
        ?.length ?? 0)
    );
  },
  0,
);

const result = {
  ok: missing.length === 0,
  pages: summary.total,
  shells: summary.shell_modes,
  unknown_routes: summary.unknown_routes,
  legacy_rendered: summary.legacy_rendered,
  semantic_tokens: tokens.length,
  semantic_classes: classes.length,
  residual_legacy_color_utilities: residualUtilities,
  residual_policy: "resolved_by_shell_and_explicit_opposite_surface",
  missing,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
