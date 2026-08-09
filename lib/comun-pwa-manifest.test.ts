import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";

describe("COMUN F2 PWA capture shortcut", () => {
  it("puts Vi um problema first and keeps Share Target deferred", () => {
    const value = manifest();
    expect(value.shortcuts?.[0]).toMatchObject({
      name: "Vi um problema",
      url: "/comun/relatar",
    });
    expect(value).not.toHaveProperty("share_target");
  });
});
