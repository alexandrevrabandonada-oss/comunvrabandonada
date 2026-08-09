import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/comun-p1g-preflight.yml", "utf8");
const actions = readFileSync("app/actions.ts", "utf8");
const callback = readFileSync("app/comun/auth/callback/route.ts", "utf8");
const wallet = readFileSync("app/api/comun/participation-wallet/[...path]/route.ts", "utf8");

test("P1G preserves one Supabase Auth path with minimum scopes", () => {
  assert.match(actions, /provider:\s*["']google["']/);
  assert.match(actions, /scopes:\s*["']openid email profile["']/);
  assert.doesNotMatch(actions, /access_type|offline|provider_token|provider_refresh_token/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.doesNotMatch(`${actions}\n${callback}`, /NextAuth|Auth\.js/);
});

test("anonymous wallet linking remains an explicit separate gesture", () => {
  assert.match(wallet, /path\[0\] === "account" && path\[1\] === "link"/);
  assert.match(wallet, /p_link_method:\s*"explicit_account_link"/);
  assert.doesNotMatch(`${actions}\n${callback}`, /comun_participation_wallet_link_account/);
});

test("preflight is read-only and permits exactly zero migrations", () => {
  const supabaseCommands = workflow
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("supabase "));
  assert.match(workflow, /begin read only;/);
  assert.match(workflow, /businessRowsRead[^\n]*false/);
  assert.match(workflow, /test "\$\{#planned\[@\]\}" -eq 0/);
  assert.equal(
    supabaseCommands.filter((line) => line.startsWith("supabase db push")).every((line) => line.includes("--dry-run")),
    true,
  );
  assert.equal(
    supabaseCommands.some((line) => /--include-all|migration repair|db reset|supabase db seed/.test(line)),
    false,
  );
  assert.doesNotMatch(workflow, /external_google_secret[^\n]*(console|stdout|writeFileSync)/);
});
