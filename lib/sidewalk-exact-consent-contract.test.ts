import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("sidewalk exact-location consent contract", () => {
  it("makes exact public location explicit before submission", () => {
    const form = read("components/sidewalk-first-participation-form.tsx");
    expect(form).toContain('name="consent_location_precision"');
    expect(form).toContain('value={consentPublish ? "exact" : "none"}');
    expect(form).toContain("Autorizo a publicação do ponto exato marcado");
    expect(form).not.toContain("uma localização\n              aproximada poderão aparecer");
  });

  it("captures the precision consent in the immutable upload payload", () => {
    const readiness = read("lib/sidewalk-submission-readiness.ts");
    expect(readiness).toContain('data.get("consent_location_precision")');
  });

  it("blocks exact moderation without one confirmed consent payload", () => {
    const action = read("app/comun/admin/calcadas/exact-actions.ts");
    expect(action).toContain('.eq("record_id", recordId)');
    expect(action).toContain('.eq("status", "confirmed")');
    expect(action).toContain("uploads?.length !== 1");
    expect(action).toContain(
      'candidate.consent_location_precision === EXACT_CONSENT_VALUE',
    );
    expect(action).toContain(
      "public_geometry_geojson: record.private_geometry_geojson",
    );
    expect(action).toContain('location_precision: "exact"');
    expect(action).toContain('consent_source: "confirmed_upload_payload"');
  });

  it("exposes the exact action only through the admin moderation form", () => {
    const page = read("app/comun/admin/calcadas/page.tsx");
    expect(page).toContain("moderateSidewalkRecordExact");
    expect(page).toContain("Aprovar com ponto exato consentido");
  });
});
