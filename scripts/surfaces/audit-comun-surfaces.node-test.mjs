import assert from "node:assert/strict";
import test from "node:test";
import { auditComunSurfaces } from "./audit-comun-surfaces.mjs";

test("classifies every COMUN page into the seven-shell migration matrix", async () => {
  const { summary, routes } = await auditComunSurfaces({ write: false });
  assert.equal(summary.total, 189);
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
});

test("keeps roots, nested routes, immersive tools and admin surfaces distinct", async () => {
  const { routes } = await auditComunSurfaces({ write: false });
  const byRoute = new Map(routes.map((route) => [route.route, route]));
  assert.equal(byRoute.get("/comun")?.shell_mode, "member_root");
  assert.equal(byRoute.get("/comun/explorar")?.shell_mode, "member_root");
  assert.equal(
    byRoute.get("/comun/pautas/[slug]")?.shell_mode,
    "member_nested",
  );
  assert.equal(byRoute.get("/comun/calcadas")?.shell_mode, "immersive");
  assert.equal(byRoute.get("/comun/admin")?.shell_mode, "admin");
  assert.equal(byRoute.get("/comun/entrar")?.shell_mode, "auth");
});
