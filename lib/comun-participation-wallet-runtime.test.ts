import { describe, expect, it } from "vitest";
import {
  createWalletRecoveryCode,
  createWalletToken,
  isWalletRecoveryCode,
  walletSecretHash,
} from "./comun-participation-wallet-runtime";

describe("participation wallet capability boundaries", () => {
  it("creates high-entropy token and grouped recovery code", () => {
    const token = createWalletToken();
    const recovery = createWalletRecoveryCode();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWalletRecoveryCode(recovery)).toBe(true);
    expect(recovery).not.toContain("0");
    expect(recovery).not.toContain("1");
  });

  it("hashes capabilities deterministically without exposing the input", () => {
    const value = "synthetic-wallet-secret";
    const digest = walletSecretHash(value);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(value);
    expect(walletSecretHash(value)).toBe(digest);
  });
});
