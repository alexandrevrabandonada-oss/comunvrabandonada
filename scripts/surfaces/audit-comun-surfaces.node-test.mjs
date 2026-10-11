import assert from "node:assert/strict";
import test from "node:test";
import { auditComunSurfaces } from "./audit-comun-surfaces.mjs";

test("classifies every COMUN page into the seven-shell migration matrix", async () => {
  const { summary, routes } = await auditComunSurfaces({ write: false });
  // Dormant/feature-flagged routes, including the reviewed-only sidewalk,
  // transport, and surface-water observatories, plus the Google completion
  // step, low-friction Pauta creation, organization detail and four A3
  // organization-scoped write routes, plus the two A4 onboarding routes, are
  // part of the full matrix.
  // A5 adds two fail-closed contextual connection routes under the existing Feirinha root.
  // A6 adds one fail-closed organization profile self-management route.
  // A5-A2 adds five specialized administrative/editorial surfaces for private curation/materialization.
  // A5-A3 adds the single read-only cultural curation desk.
  // A0 adds /comun/denuncias as a public semantic door over Relata.
  // B0 adds /comun/denuncias/mapa as the canonical, flag-cloaked public map surface.
  // B2-A1 adds the public problem detail surface over the existing map.
  // R5 adds one publisher-only collective-entity projection desk.
  // The operational chain adds member onboarding plus one R4 reviewer desk.
  // Escola R0 adds six learner pages and one civic/editorial review desk.
  // Public catalog excerpts add one institutional consultation route.
  // Includes the public material and stable, public-only result detail.
  assert.equal(summary.total, 242);
  // Also includes the public read-only first-action guide from #520.
  assert.deepEqual(summary.duplicate_routes, []);
  assert.deepEqual(Object.keys(summary.shell_modes).sort(), [
    "admin",
    "auth",
    "immersive",
    "institutional",
    "member_nested",
    "member_root",
    "public_web",
  ]);
  assert.ok(routes.every((route) => route.primary_action));
  assert.ok(routes.every((route) => route.contextual_app_bar !== undefined));
  assert.ok(routes.every((route) => route.wave >= 1 && route.wave <= 4));
  assert.equal(summary.legacy_rendered, 0);
  assert.equal(summary.p0_p1, 0);
  assert.equal(summary.admin_wave3, 86);
  assert.equal(summary.admin_wave4, 12);
  assert.equal(summary.unknown_routes, 0);
  assert.equal(summary.structural_incompatibilities, 0);
  assert.equal(summary.generic_admin_app_bars, 0);
});

test("admin civic and editorial routes inherit navigation and table contracts", async () => {
  const { routes } = await auditComunSurfaces({ write: false });
  const wave3 = routes.filter((route) => route.wave === 3);
  assert.equal(wave3.length, 86);
  assert.ok(wave3.every((route) => route.shell_mode === "admin"));
  assert.ok(wave3.every((route) => route.contextual_app_bar));
  assert.ok(wave3.every((route) => route.preserves_filters_or_return));
  assert.ok(wave3.every((route) => route.accessible_table_contract));
  assert.ok(
    wave3.every(
      (route) => !["P0", "P1"].includes(route.compatibility_severity),
    ),
  );
});

test("admin systemic routes use the canonical level-zero platform contract", async () => {
  const { routes } = await auditComunSurfaces({ write: false });
  const wave4 = routes.filter((route) => route.wave === 4);
  assert.equal(wave4.length, 12);
  assert.ok(wave4.every((route) => route.shell_mode === "admin"));
  assert.ok(wave4.every((route) => route.platform_domain));
  assert.ok(wave4.every((route) => route.platform_access));
  assert.ok(wave4.every((route) => route.platform_shell));
  assert.ok(wave4.every((route) => route.preserves_app_v2_flag === true));
  assert.ok(wave4.every((route) => route.member_bottom_navigation === false));
  assert.ok(wave4.every((route) => route.preserves_filters_or_return));
});

test("keeps roots, nested routes, immersive tools and admin surfaces distinct", async () => {
  const { routes } = await auditComunSurfaces({ write: false });
  const byRoute = new Map(routes.map((route) => [route.route, route]));
  for (const route of [
    "/comun/escola",
    "/comun/escola/trilhas",
    "/comun/escola/missao/[slug]",
    "/comun/escola/pratica",
    "/comun/escola/materiais",
    "/comun/escola/progresso",
  ]) {
    assert.equal(byRoute.get(route)?.shell_mode, "member_nested", route);
  }
  assert.equal(byRoute.get("/comun/admin/escola")?.shell_mode, "admin");
  assert.equal(byRoute.get("/comun/admin/escola")?.wave, 3);
  assert.equal(byRoute.get("/comun")?.shell_mode, "member_root");
  assert.equal(
    byRoute.get("/comun/ajuda/primeira-acao")?.shell_mode,
    "institutional",
  );
  assert.equal(
    byRoute.get("/comun/ajuda/praticas/[slug]")?.shell_mode,
    "institutional",
  );
  assert.equal(
    byRoute.get("/comun/ajuda/praticas/[slug]")?.auth_required,
    false,
  );
  assert.equal(byRoute.get("/comun/explorar")?.shell_mode, "member_root");
  assert.equal(
    byRoute.get("/comun/cooperativas/[slug]")?.shell_mode,
    "public_web",
  );
  assert.equal(
    byRoute.get("/comun/pautas/[slug]")?.shell_mode,
    "member_nested",
  );
  assert.equal(byRoute.get("/comun/calcadas")?.shell_mode, "immersive");
  assert.equal(
    byRoute.get("/comun/calcadas/contribuir")?.shell_mode,
    "immersive",
  );
  assert.equal(
    byRoute.get("/comun/admin/calcadas/relatos")?.shell_mode,
    "admin",
  );
  assert.equal(byRoute.get("/comun/admin")?.shell_mode, "admin");
  assert.equal(byRoute.get("/comun/entrar")?.shell_mode, "auth");
});
