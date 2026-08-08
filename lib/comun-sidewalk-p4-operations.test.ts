import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("P4 operational boundaries", () => {
  it("promotes only the exact P4 migration after the external-ledger quarantine", () => {
    const workflow = read(".github/workflows/comun-p4-promotion.yml");
    expect(workflow).toContain("20260808180246_comun_sidewalk_relata_real.sql");
    expect(workflow).toContain("COMUN_P4_REMOTE_PLAN_EXACT_ONE");
    expect(workflow).toContain("trap restore_external EXIT");
    expect(workflow).not.toContain("--include-all");
    expect(workflow).not.toContain("migration repair");
    expect(workflow).not.toContain("db reset --linked");
  });

  it("keeps intake and public projection as independent rollout switches", () => {
    const workflow = read(".github/workflows/comun-p4-activation.yml");
    expect(workflow).toContain("COMUN_SIDEWALK_RELATA_ENABLED");
    expect(workflow).toContain("COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED");
    expect(workflow).toContain("activate-intake-smoke");
    expect(workflow).toContain("activate-projection-readonly");
    expect(workflow).toContain(
      "Roll back private intake automatically after failed smoke",
    );
    expect(workflow).toContain(
      "env add COMUN_SIDEWALK_RELATA_ENABLED production --force",
    );
    expect(workflow).toContain(
      "env add COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED production --force",
    );
    expect(workflow).not.toContain(
      "env update COMUN_SIDEWALK_RELATA_ENABLED",
    );
    expect(workflow).not.toContain(
      "env update COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED",
    );
    expect(workflow).not.toContain(
      '"$COMUN_BASE_URL/comun/calcadas/contribuir")" = 404',
    );
  });

  it("uses soft cleanup and removes private attachment objects", () => {
    const harness = read("scripts/solo/rehearse-p4-sidewalk-production.mjs");
    const attachmentRoute = read(
      "app/api/comun/relata/evidence/attachments/[attachmentId]/route.ts",
    );
    expect(harness).toContain("P4_SYNTHETIC_FIXTURE_CLEANUP");
    expect(harness).toContain("hardDeletes: 0");
    expect(harness).not.toMatch(/delete\s+from/i);
    expect(attachmentRoute).toContain(
      "removeComunRelataEvidenceObjects(local.db, attachmentId)",
    );
  });
});
