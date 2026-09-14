import { describe, expect, it } from "vitest";
import {
  getCommunityExperience,
  listCommunityExperiences,
} from "./community-experience";

describe("public community experience boundary", () => {
  it("does not return the explicitly synthetic city experience by direct slug", () => {
    expect(getCommunityExperience("cidade")).toBeNull();
  });
  it("excludes the synthetic record while retaining editorial communities", () => {
    expect(listCommunityExperiences().map((item) => item.slug)).not.toContain(
      "cidade",
    );
    expect(getCommunityExperience("trabalho")?.slug).toBe("trabalho");
    expect(JSON.stringify(listCommunityExperiences())).not.toContain("fixture");
  });
});
