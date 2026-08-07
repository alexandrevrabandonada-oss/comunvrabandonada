import { describe, expect, it } from "vitest";
import { isCommunityRegistrationOpen } from "./community-registration";

describe("community registration gate", () => {
  it("opens only for an explicit open value", () => {
    expect(isCommunityRegistrationOpen({ COMMUNITY_REGISTRATION_MODE: "open" })).toBe(true);
    expect(isCommunityRegistrationOpen({})).toBe(false);
    expect(isCommunityRegistrationOpen({ COMMUNITY_REGISTRATION_MODE: "closed" })).toBe(false);
    expect(isCommunityRegistrationOpen({ COMMUNITY_REGISTRATION_MODE: "OPEN" })).toBe(false);
  });
});
