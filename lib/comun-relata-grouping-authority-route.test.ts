import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  collectiveEnabled: vi.fn(),
  readWalletToken: vi.fn(),
  walletDb: vi.fn(),
  walletSecretHash: vi.fn((token: string) => `hash:${token}`),
  associate: vi.fn(),
}));

vi.mock("@/lib/comun-relata-evidence-feature", () => ({
  isComunRelataCollectiveEnabled: mocks.collectiveEnabled,
}));
vi.mock("@/lib/comun-participation-wallet-runtime", () => ({
  readWalletToken: mocks.readWalletToken,
  walletDb: mocks.walletDb,
  walletSecretHash: mocks.walletSecretHash,
}));
vi.mock("@/lib/comun-relata-evidence-runtime", () => ({
  associateComunRelataCollectiveForWallet: mocks.associate,
  COMUN_RELATA_EVIDENCE_NO_STORE: { "cache-control": "no-store" },
}));

const route = await import("@/app/api/comun/relata/evidence/grouping/route");
const validId = "11111111-1111-4111-8111-111111111111";
const request = (suffix = "") =>
  new NextRequest(`https://example.test/api/comun/relata/evidence/grouping${suffix}`);

async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function expectNoPrivateIdentifiers(value: Record<string, unknown>) {
  for (const key of ["case_id", "report_id", "membership_id", "collective_case_id"])
    expect(JSON.stringify(value)).not.toContain(key);
}

beforeEach(() => {
  mocks.collectiveEnabled.mockReturnValue(true);
  mocks.readWalletToken.mockReturnValue(undefined);
  mocks.walletDb.mockReset();
  mocks.associate.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("holder-only collective grouping authority boundary", () => {
  it("keeps a disabled collective feature cloaked", async () => {
    mocks.collectiveEnabled.mockReturnValue(false);
    const response = await route.GET(request());
    expect(response.status).toBe(404);
    expect(await body(response)).toEqual({ code: "grouping_unavailable" });
  });

  it("returns 401 when the runtime is enabled but wallet authority is absent", async () => {
    for (const handler of [route.GET, route.POST]) {
      const response = await handler(request());
      expect(response.status).toBe(401);
      const payload = await body(response);
      expect(payload).toEqual({ code: "wallet_authority_required" });
      expectNoPrivateIdentifiers(payload);
    }
  });

  it("returns 400 for a missing or malformed wallet item after authority is present", async () => {
    mocks.readWalletToken.mockReturnValue("wallet-token");
    for (const suffix of ["", "?walletItemId=not-a-uuid"]) {
      for (const handler of [route.GET, route.POST]) {
        const response = await handler(request(suffix));
        expect(response.status).toBe(400);
        const payload = await body(response);
        expect(payload).toEqual({ code: "wallet_item_required" });
        expectNoPrivateIdentifiers(payload);
      }
    }
  });

  it("keeps a syntactically valid but unowned item opaque", async () => {
    mocks.readWalletToken.mockReturnValue("wallet-token");
    mocks.walletDb.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) });
    for (const handler of [route.GET, route.POST]) {
      const response = await handler(request(`?walletItemId=${validId}`));
      expect(response.status).toBe(404);
      const payload = await body(response);
      expect(payload).toEqual({ code: "grouping_unavailable" });
      expectNoPrivateIdentifiers(payload);
    }
  });

  it("returns only the sanitized waiting or matched holder signal", async () => {
    mocks.readWalletToken.mockReturnValue("wallet-token");
    mocks.walletDb.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [{ connection: "waiting" }], error: null }),
    });
    const waiting = await route.GET(request(`?walletItemId=${validId}`));
    expect(waiting.status).toBe(200);
    const waitingPayload = await body(waiting);
    expect(waitingPayload).toEqual({ collectiveConnection: "waiting" });
    expectNoPrivateIdentifiers(waitingPayload);

    mocks.associate.mockResolvedValue({ grouping_state: "auto_link_high_confidence" });
    const matched = await route.POST(request(`?walletItemId=${validId}`));
    expect(matched.status).toBe(200);
    const matchedPayload = await body(matched);
    expect(matchedPayload).toEqual({ collectiveConnection: "matched" });
    expectNoPrivateIdentifiers(matchedPayload);
  });
});
