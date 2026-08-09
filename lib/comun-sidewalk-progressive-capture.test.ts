import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createComunSidewalkProgressiveCaptureDecision,
  isComunSidewalkProgressiveCaptureEnabled,
} from "./comun-sidewalk-progressive-capture";

const enabled = {
  ALLOW_LOCAL_TESTS: "true",
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  COMUN_SIDEWALK_RELATA_ENABLED: "enabled",
  COMUN_RELATA_PHOTO_ONLY_ENABLED: "enabled",
  COMUN_QUICK_CAPTURE_V2: "enabled",
  COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString(
    "base64url",
  ),
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-only",
};

describe("COMUN sidewalk progressive capture", () => {
  it("is cumulative over the existing private sidewalk and photo-only gates", () => {
    expect(isComunSidewalkProgressiveCaptureEnabled(enabled)).toBe(true);
    expect(
      isComunSidewalkProgressiveCaptureEnabled({
        ...enabled,
        COMUN_RELATA_PHOTO_ONLY_ENABLED: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunSidewalkProgressiveCaptureEnabled({
        ...enabled,
        COMUN_SIDEWALK_RELATA_ENABLED: "disabled",
      }),
    ).toBe(false);
  });

  it("creates only the explicit null-text sidewalk decision", () => {
    expect(createComunSidewalkProgressiveCaptureDecision()).toEqual(
      expect.objectContaining({
        category: "sidewalk_accessibility",
        privacy: "sensitive",
        captureBasis: "photo_only",
        semanticTextState: "absent",
        requiresHumanReview: true,
        requiresEnrichment: true,
        automaticForwarding: false,
      }),
    );
  });

  it("creates once, completes through the existing adapter, and never invents text", () => {
    const route = readFileSync(
      "app/api/comun/calcadas/intake/route.ts",
      "utf8",
    );
    const capture = route.slice(
      route.indexOf("async function createProgressiveCapture"),
      route.indexOf("async function createLegacyIntake"),
    );
    const completion = route.slice(
      route.indexOf("export async function PATCH"),
    );
    expect(capture.match(/comun_relata_create/g)).toHaveLength(1);
    expect(capture).toContain("p_original_text: null");
    expect(capture).not.toContain("comun_sidewalk_intake_create");
    expect(completion).not.toContain("comun_relata_create");
    expect(completion.match(/comun_sidewalk_intake_create/g)).toHaveLength(1);
    expect(route).not.toMatch(
      /Foto enviada|Registro fotográfico|Observação registrada por fotografia|Sem descrição/,
    );
  });

  it("ships without a C1 migration and with reversible Production activation", () => {
    expect(
      readdirSync("supabase/migrations").filter((name) =>
        /f2.*c1|c1.*sidewalk.*progressive/i.test(name),
      ),
    ).toEqual([]);
    const workflow = readFileSync(
      ".github/workflows/comun-f2-c1-activation.yml",
      "utf8",
    );
    expect(workflow).toContain(
      "env add COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_ENABLED production --sensitive --force",
    );
    expect(workflow).toContain("COMUN_F2_C1_ROLLED_BACK_AFTER_FAILED_SMOKE");
    expect(workflow).toContain("expected_main_sha");
    expect(workflow).toContain(
      "rehearse-f2-c1-sidewalk-progressive-production.mjs",
    );
  });
});
