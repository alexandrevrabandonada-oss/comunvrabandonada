import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("COMUN P6C-A private SUS contract", () => {
  it("adds no migration or health miniapp", () => {
    const migrations = readdirSync(join(root, "supabase/migrations"));
    expect(migrations.some((name) => /p6c|health|sus/i.test(name))).toBe(false);
    expect(() => read("app/comun/sus/page.tsx")).toThrow();
    expect(() => read("app/comun/saude/denunciar/page.tsx")).toThrow();
    expect(() => read("app/comun/hospital/page.tsx")).toThrow();
  });

  it("persists the router privacy class and never the generic recomputation", () => {
    const route = read("app/api/comun/relata/route.ts");
    expect(route).toContain("p_privacy_class: decision.privacyClass");
    expect(route).not.toContain("p_privacy_class: classifyRelataPrivacy(input)");
  });

  it("keeps health forwarding hard-disabled and channels outside SQL", () => {
    const feature = read("lib/comun-public-health-sensitive-feature.ts");
    const catalog = read("lib/server/comun-health-institutional-channel-catalog.ts");
    expect(feature).toContain("return false");
    expect(feature).toContain("COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED");
    expect(catalog).toContain("automationAllowed: false");
    expect(catalog).toContain("operationally_unchecked");
    expect(
      readdirSync(join(root, "supabase/migrations")).some((name) =>
        /health_channel|sus_channel/i.test(name),
      ),
    ).toBe(false);
  });

  it("keeps the public health category out of public projections", () => {
    const projection = read("lib/comun-relata-public-projection.ts");
    expect(projection).not.toMatch(/public_health\s*:/);
    expect(projection).toContain('"health"');
  });

  it("does not create a sensitive forwarding package or external request", () => {
    const quickCapture = read("app/comun/relatar/quick-capture-v2.tsx");
    const channelRoute = read("app/api/comun/health-channels/route.ts");
    expect(quickCapture).toContain("ComunHealthChannelsPanel");
    expect(quickCapture).not.toMatch(/comun_forwarding_packages/);
    expect(channelRoute).not.toMatch(/fetch\(|window\.open|person_declared_sent/);
  });
});
