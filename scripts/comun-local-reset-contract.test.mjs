import { describe, expect, it } from "vitest";
import {
  assertCompleteMigrations,
  buildResetEvidence,
  classifyReset,
  shouldRestartKong,
  truncateResetLog,
} from "./comun-local-reset-contract.mjs";

describe("contrato do reset local autenticado", () => {
  it("classifica reset totalmente verde como C", () => {
    expect(classifyReset({ exitCode: 0, migrations: 52, expectedMigrations: 52, recovered: true })).toBe("C");
  });

  it("classifica 502 transitório recuperado como B", () => {
    expect(classifyReset({ exitCode: 1, migrations: 52, expectedMigrations: 52, recovered: true })).toBe("B");
  });

  it("recusa migration incompleta", () => {
    expect(() => assertCompleteMigrations(51, 52)).toThrow("migrations incompletas");
  });

  it("recusa timeout ou serviço que não recupera", () => {
    expect(() => classifyReset({ exitCode: 1, migrations: 52, expectedMigrations: 52, recovered: false })).toThrow("readiness não recuperou");
  });

  it("só permite uma reinicialização restrita do Kong com evidência", () => {
    expect(shouldRestartKong({ recoveryError: "auth http=502", authHealth: "healthy", alreadyRestarted: false })).toBe(true);
    expect(shouldRestartKong({ recoveryError: "storage http=502", authHealth: "healthy", alreadyRestarted: false })).toBe(false);
    expect(shouldRestartKong({ recoveryError: "auth http=502", authHealth: "healthy", alreadyRestarted: true })).toBe(false);
  });

  it("preserva apenas o final de logs longos", () => {
    const longLog = `${"a".repeat(2100)}fim`;
    expect(truncateResetLog(longLog)).toContain("fim");
    expect(truncateResetLog(longLog).length).toBeLessThan(longLog.length);
  });

  it("registra run id, timestamps e falha", () => {
    const evidence = buildResetEvidence({ runId: "r2", round: "2", commit: "abc", startedAt: "a", finishedAt: "b", records: [], failure: "falhou" });
    expect(evidence).toMatchObject({ runId: "r2", ok: false, failure: "falhou" });
  });
});
