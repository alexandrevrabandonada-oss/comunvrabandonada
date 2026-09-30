import { describe, expect, it } from "vitest";
import {
  communitiesWithOpenActions,
  communityStateLabel,
  filterCommunityExperiences,
  getCommunityExperience,
  listCommunityExperiences,
} from "./community-experience";

describe("public community experience", () => {
  it("does not publish demo operations or fixed historical schedules", () => {
    const directory = listCommunityExperiences();
    expect(directory.map((x) => x.slug)).not.toContain("cidade");
    for (const x of [...directory, getCommunityExperience("cidade")!]) {
      expect(x.nextActivity).toBeNull();
      expect(x.circle).toBeNull();
      expect(x.workingGroups).toEqual([]);
      expect(JSON.stringify(x)).not.toMatch(
        /fixture|demonstração|sintétic|fictício/i,
      );
    }
    expect(getCommunityExperience("cidade")?.state).toBe("preparing");
    expect(getCommunityExperience("missing")).toBeNull();
  });
  it("keeps purpose, participation and governance discoverable", () => {
    for (const x of listCommunityExperiences()) {
      expect(x.purpose.length).toBeGreaterThan(30);
      expect(x.nextAction.length).toBeGreaterThan(15);
      expect(x.governance.roles.length).toBeGreaterThan(0);
    }
    expect(
      filterCommunityExperiences(
        listCommunityExperiences(),
        "saúde",
        "",
        "",
        false,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("does not treat an editorial next step as an open action", () => {
    const values = listCommunityExperiences();
    expect(filterCommunityExperiences(values, "", "", "", true)).toEqual([]);
    const slugs = communitiesWithOpenActions(
      [
        { status: "open", community: { slug: "trabalho" }, endsAt: null },
        { status: "completed", community: { slug: "escolas" }, endsAt: null },
        {
          status: "open",
          community: { slug: "saude" },
          endsAt: "2026-07-01T00:00:00Z",
        },
        { status: "open", community: { slug: "escolas" }, endsAt: "invalid" },
        { status: "open", community: null, endsAt: null },
      ],
      Date.parse("2026-09-30T14:00:00Z"),
    );
    expect(
      filterCommunityExperiences(values, "", "", "", true, slugs).map(
        (x) => x.slug,
      ),
    ).toEqual(["trabalho"]);
  });
  it("does not infer a personal relationship from editorial monitoring", () => {
    expect(communityStateLabel("monitoring")).toBe("Em acompanhamento");
    expect(JSON.stringify(getCommunityExperience("trabalho"))).not.toMatch(
      /followers|likes|memberCount|seguidores/i,
    );
  });
});
