import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  archive: vi.fn(),
  radio: vi.fn(),
  economy: vi.fn(),
}));
vi.mock("@/lib/archive", () => ({ readPublicArchiveItems: mocks.archive }));
vi.mock("@/lib/radio", () => ({ readPublicRadio: mocks.radio }));
vi.mock("./comun-solidarity-economy-directory", () => ({
  getPublicSolidarityEconomyDirectory: mocks.economy,
}));
vi.mock("@/lib/comun-solidarity-economy", () => ({
  isComunSolidarityEconomyPublicCoreEnabled: () => true,
}));
vi.mock("@/lib/comun-solidarity-organization-governance", () => ({
  isComunSolidarityOrganizationGovernanceEnabled: () => true,
}));
import { readPublicDiscovery } from "./comun-public-discovery";
beforeEach(() => {
  mocks.archive.mockResolvedValue({ state: "empty", items: [] });
  mocks.radio.mockResolvedValue({ state: "empty", programs: [], episodes: [] });
  mocks.economy.mockResolvedValue({
    sourceState: "available",
    offers: [],
    needs: [],
  });
});
afterEach(() => vi.useRealTimers());
it("one unavailable source does not change other successful empty reads", async () => {
  mocks.archive.mockRejectedValue(Error("PRIVATE"));
  expect(await readPublicDiscovery()).toEqual([
    { kind: "acervo", state: "unavailable", items: [] },
    { kind: "radio", state: "empty", items: [] },
    { kind: "feirinha", state: "empty", items: [] },
  ]);
});
it("a stalled source is bounded independently without exposing its error", async () => {
  vi.useFakeTimers();
  mocks.radio.mockReturnValue(new Promise(() => {}));
  const result = readPublicDiscovery();
  await vi.advanceTimersByTimeAsync(3000);
  expect((await result).map((s) => s.state)).toEqual([
    "empty",
    "unavailable",
    "empty",
  ]);
  expect(vi.getTimerCount()).toBe(0);
});
