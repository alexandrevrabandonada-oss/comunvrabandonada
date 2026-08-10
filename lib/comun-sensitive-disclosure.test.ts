import { describe, expect, it } from "vitest";
import { buildSensitiveDisclosurePreview } from "./comun-sensitive-disclosure";

describe("COMUN sensitive disclosure preview", () => {
  it("uses only explicitly selected health fields and never the original report", () => {
    const preview = buildSensitiveDisclosurePreview(
      "public_health",
      "Medicamento ou insumo",
      {
        includeIssueType: true,
        includeUnitLabel: false,
        unitLabel: "UNSELECTED_UNIT_SENTINEL",
        includeNetworkLabel: false,
        networkLabel: "",
        includeApproximatePeriod: true,
        approximatePeriod: "desde a semana passada",
        includePersonAuthoredSummary: false,
        personAuthoredSummary: "ORIGINAL_TEXT_SENTINEL",
      },
    );
    expect(preview.institutionalText).toContain("Medicamento ou insumo");
    expect(preview.institutionalText).toContain("desde a semana passada");
    expect(preview.institutionalText).not.toContain("UNSELECTED_UNIT_SENTINEL");
    expect(preview.institutionalText).not.toContain("ORIGINAL_TEXT_SENTINEL");
    expect(preview.notSharedItems).toContain("relato original");
    expect(preview.notSharedItems).toContain("localização");
  });

  it("produces no copyable text for child protection", () => {
    const preview = buildSensitiveDisclosurePreview(
      "child_protection",
      null,
      {
        includeIssueType: false,
        includeUnitLabel: false,
        unitLabel: "",
        includeNetworkLabel: false,
        networkLabel: "",
        includeApproximatePeriod: false,
        approximatePeriod: "",
        includePersonAuthoredSummary: false,
        personAuthoredSummary: "",
      },
    );
    expect(preview.channelOnly).toBe(true);
    expect(preview.institutionalText).toBeNull();
    expect(preview.sharedItems).toEqual(["nenhum conteúdo da situação pelo COMUN"]);
  });
});
