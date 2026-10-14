import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
const read = (path: string) => readFileSync(path, "utf8");
describe("SOC-D08 isolation and scope", () => {
  it("runs both proof domains at the exact head with no external credentials/secrets", () => {
    const workflow = load(
      read(".github/workflows/comun-soc-d08-continuity.yml"),
    ) as any;
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(JSON.stringify(workflow)).not.toMatch(
      /secrets\.|SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(Object.keys(workflow.jobs)).toEqual([
      "actual-ui-controlled-transport",
      "real-disposable-auth-postgres",
    ]);
    for (const job of Object.values(workflow.jobs) as any[]) {
      const checkout = job.steps.find(
        (step: any) => step.uses === "actions/checkout@v4",
      );
      expect(checkout.with.ref).toBe(
        "${{ github.event.pull_request.head.sha }}",
      );
      expect(checkout.with["persist-credentials"]).toBe(false);
    }
  });
  it("cannot load the synthetic Auth transport through the product config", () => {
    expect(read("next.config.mjs")).not.toMatch(
      /SOC_D08|fixture-app|solidarity-continuity/,
    );
    const fixture = read(
      "tests/solidarity-continuity/fixture-app/next.config.mjs",
    );
    expect(fixture).toContain("FIXTURE_REJECTS_EXTERNAL_CREDENTIALS");
    expect(fixture).toContain("LOCAL_SYNTHETIC_ONLY");
    expect(read("tests/solidarity-continuity/run-fixture.mjs")).toContain(
      '"127.0.0.1"',
    );
  });
  it("keeps initial hydration independent of browser storage and does not suppress mismatches", () => {
    const form = read("components/comun-solidarity-connection-form.tsx");
    expect(form).toContain("useSyncExternalStore");
    expect(form).not.toContain("suppressHydrationWarning");
    expect(form).not.toContain("sessionStorage.setItem");
  });
  it("actual logout UI clears drafts and still submits the existing server action", () => {
    expect(read("components/comun-pwa-runtime.tsx")).toContain(
      "clearSolidarityConnectionDrafts(() => window.sessionStorage)",
    );
    expect(read("app/comun/conta/page.tsx")).toContain(
      "<form action={logoutCommunity}>",
    );
    expect(read("app/actions.ts")).toMatch(
      /export async function logoutCommunity\(\)[\s\S]*?auth.signOut\(\)/,
    );
  });
  it("disposable proof reuses the canonical A5 script, guards loopback and suppresses CLI keys", () => {
    const proof = read("scripts/economy/prove-soc-d08-disposable.mjs");
    expect(proof).toContain(".github/workflows/comun-48-4-a5-disposable.yml");
    expect(proof).toContain("SOC_D08_AUTH_LOOPBACK_REQUIRED");
    expect(proof).toContain("SOC_D08_EXTERNAL_CREDENTIALS_REJECTED");
    expect(proof).toContain("SOC_D08_OWNED_USER_CLEANUP_FAILED");
    expect(proof).not.toMatch(
      /console\.(log|error)\((raw|local|password|email|users|result)/,
    );
  });
});
