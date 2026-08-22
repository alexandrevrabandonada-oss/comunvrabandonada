import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  resolve(process.cwd(), "app/comun/admin/acervo/contribuicoes/actions.ts"),
  "utf8",
);

describe("cultural curation admin contract", () => {
  it("requires the centralized readiness resolver before editorial status or draft materialization", () => {
    expect(actions).toContain("isArchiveSubmissionTransitionAllowed");
    expect(actions).toContain("readyForDraftMaterialization");
  });

  it("keeps the remaining photo adapter private and does not promote rights or Search", () => {
    expect(actions).toContain('status: "draft"');
    expect(actions).toContain('visibility: "private"');
    expect(actions).toContain('rights_status: "unknown"');
    expect(actions).not.toContain('rights_status: "permission_granted"');
    expect(actions).not.toContain("comun_search_documents");
    expect(actions).not.toContain("visibility: \"public\"");
  });
});
