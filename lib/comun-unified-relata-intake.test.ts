import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) =>
  fs.readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n");

describe("48.1D-S1 unified Relata intake contracts", () => {
  it("keeps ReportForm and submitReport outside the public route tree", () => {
    const page = read("app/comun/relatar/page.tsx");
    expect(page).toContain("<QuickCaptureV2");
    expect(page).not.toContain("ReportForm");
    expect(page).not.toContain("searchParams.modo");
    expect(page).not.toContain("isComunQuickCaptureEnabled");
    expect(page).not.toContain("notFound()");

    const legacyForm = read("app/comun/relatar/report-form.tsx");
    expect(legacyForm).toContain("LEGACY_INTAKE_NOT_CANONICAL");
  });

  it("does not gate canonical persistence on missingInformation", () => {
    const route = read("app/api/comun/relata/route.ts");
    expect(route).not.toContain("triage_incomplete");
    expect(route).not.toMatch(/if \(decision\.missingInformation\.length/);
  });

  it("has no public CTA back to the legacy detailed form", () => {
    const capture = read("app/comun/relatar/quick-capture-v2.tsx");
    expect(capture).not.toContain("Abrir formulário detalhado");
    expect(capture).not.toContain("/comun/relatar?modo=detalhado");
  });

  it("redirects the old intake alias to the canonical route", () => {
    const alias = read("app/comun/relata/page.tsx");
    expect(alias).toContain('permanentRedirect("/comun/relatar")');
    expect(alias).not.toContain("RelataPreview");
  });
});
