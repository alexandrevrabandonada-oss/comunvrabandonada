import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const quickCapture = readFileSync("app/comun/relatar/quick-capture-v2.tsx", "utf8");
const reportForm = readFileSync("app/comun/relatar/report-form.tsx", "utf8");
const locationRoute = readFileSync("app/api/comun/relata/evidence/location/route.ts", "utf8");

describe("P3B private location boundary", () => {
  it("never persists coordinates in the resumable browser draft", () => {
    expect(quickCapture).not.toMatch(/comun_capture_draft_v1[^\n]*point/);
    expect(reportForm).not.toMatch(/draft\.point/);
    expect(quickCapture).toContain("hasPrivateLocation");
  });

  it("keeps location and photo failures independent", () => {
    expect(quickCapture).toContain("const outcome = { photo: false, location: false }");
    expect(quickCapture).toContain("Photo failure is independent");
    expect(quickCapture).toContain("Location failure is independent");
  });

  it("does not call collective association while the collective flag is off", () => {
    expect(locationRoute).toContain("if (isComunRelataCollectiveEnabled())");
  });
});
