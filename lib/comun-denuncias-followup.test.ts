import { describe, expect, it } from "vitest";
import { POWER_ESCALATION_CHAIN, resolveDenunciasFollowup } from "./comun-denuncias-followup";

const now = new Date("2026-08-25T12:00:00.000Z");

describe("denuncias follow-up projection", () => {
  it("keeps prepared distinct from sent", () => {
    expect(resolveDenunciasFollowup({ category: "water_supply", attempts: [{ state: "prepared", sequence: 1 }] }).state).toBe("needs_send");
  });

  it("requests an expected official protocol without treating 72h as an SLA", () => {
    const result = resolveDenunciasFollowup({
      category: "power_distribution",
      now,
      selectedChannels: [{ id: "light-agencia-virtual", label: "Light", sourceStatus: "source_verified", protocolExpectation: "expected" }],
      attempts: [{ state: "person_declared_sent", sequence: 1, institutionalChannelId: "light-agencia-virtual", declaredAt: "2026-08-17T12:00:00.000Z" }],
    });
    expect(result.state).toBe("needs_protocol");
    expect(result.officialDeadlineLabel).toContain("Não encontramos");
    expect(result.headline).not.toContain("atrasado");
  });

  it("preserves legacy responded/null as review, not a guessed outcome", () => {
    expect(resolveDenunciasFollowup({ category: "water_supply", attempts: [{ state: "responded", sequence: 1, resolutionOutcome: null }] }).state).toBe("response_received");
  });

  it("makes unresolved responses actionable and unlocks only the verified energy chain", () => {
    const result = resolveDenunciasFollowup({
      category: "power_distribution",
      selectedChannels: [{ id: "light-agencia-virtual", label: "Light", sourceStatus: "source_verified" }],
      escalationSteps: POWER_ESCALATION_CHAIN,
      attempts: [{ state: "responded", sequence: 1, institutionalChannelId: "light-agencia-virtual", officialProtocolMasked: "123••••", resolutionOutcome: "unresolved" }],
    });
    expect(result.state).toBe("escalation_available");
    expect(result.nextChannelId).toBe("light-ouvidoria");
    expect(result.nextActionLabel).toContain("Ouvidoria");
  });

  it("never offers ANEEL as the first step", () => {
    const result = resolveDenunciasFollowup({
      category: "power_distribution",
      attempts: [{ state: "responded", sequence: 1, institutionalChannelId: "light-agencia-virtual", resolutionOutcome: "unresolved" }],
      escalationSteps: [{ ...POWER_ESCALATION_CHAIN[1] }],
    });
    expect(result.state).toBe("unresolved");
  });

  it("keeps emergency attempts outside administrative escalation", () => {
    const result = resolveDenunciasFollowup({
      category: "active_fire",
      emergency: true,
      attempts: [{ state: "responded", sequence: 1, institutionalChannelId: "cbmerj-193", resolutionOutcome: "unresolved" }],
      escalationSteps: [{ id: "later", label: "Later", afterChannelIds: ["cbmerj-193"], sourceStatus: "source_verified" }],
    });
    expect(result.state).toBe("unresolved");
  });
});
