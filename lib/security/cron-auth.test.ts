import { afterEach, describe, expect, it, vi } from "vitest";
import { matchesCronSecret } from "./cron-auth";

afterEach(() => vi.unstubAllEnvs());

describe("cron authentication", () => {
  it("rejects missing credentials and accepts either key during rotation", () => {
    vi.stubEnv("CRON_SECRET", "current");
    vi.stubEnv("CRON_SECRET_NEXT", "rotated");
    expect(matchesCronSecret("")).toBe(false);
    expect(matchesCronSecret("current")).toBe(true);
    expect(matchesCronSecret("rotated")).toBe(true);
    expect(matchesCronSecret("invalid")).toBe(false);
  });

  it("rejects multibyte input of equal character length without throwing", () => {
    vi.stubEnv("CRON_SECRET", "aa");
    vi.stubEnv("CRON_SECRET_NEXT", "");
    expect(matchesCronSecret("éé")).toBe(false);
    expect(matchesCronSecret("é")).toBe(false);
  });

  it("fails closed without configured keys", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("CRON_SECRET_NEXT", "");
    expect(matchesCronSecret("anything")).toBe(false);
  });
});
