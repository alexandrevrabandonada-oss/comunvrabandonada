import { describe, expect, it } from "vitest";
import {
  resolveCommunitySelfServiceState,
  validateCommunityGroupMember,
  validateCommunityMembershipReview,
  validateCommunityRoleMutation,
} from "./community-administration";

describe("community administration", () => {
  it("não permite que solicitação própria transforme seguidor em membro", () => {
    expect(
      resolveCommunitySelfServiceState({
        priorState: "following",
        priorJoinedAt: null,
        intent: "join",
      }),
    ).toBe("following");
  });

  it("preserva membro já aprovado e trata pausa e saída", () => {
    expect(
      resolveCommunitySelfServiceState({
        priorState: "member",
        priorJoinedAt: "2026-07-01T00:00:00Z",
        intent: "join",
      }),
    ).toBe("member");
    expect(
      resolveCommunitySelfServiceState({
        priorState: "member",
        priorJoinedAt: "2026-07-01T00:00:00Z",
        intent: "pause",
      }),
    ).toBe("paused");
    expect(
      resolveCommunitySelfServiceState({
        priorState: "following",
        priorJoinedAt: null,
        intent: "leave",
      }),
    ).toBe("left");
  });

  it("recusa aprovação duplicada, operação encerrada e vínculo suspenso", () => {
    expect(
      validateCommunityMembershipReview({
        operationState: "resolved",
        membershipState: "following",
        decision: "approve",
      }),
    ).toMatchObject({ ok: false, reason: "operation_closed" });
    expect(
      validateCommunityMembershipReview({
        operationState: "pending",
        membershipState: "member",
        decision: "approve",
      }),
    ).toMatchObject({ ok: false, reason: "already_member" });
    expect(
      validateCommunityMembershipReview({
        operationState: "pending",
        membershipState: "suspended",
        decision: "reject",
      }),
    ).toMatchObject({ ok: false, reason: "membership_suspended" });
  });

  it("concede papel apenas a membro ativo e papel conhecido", () => {
    expect(
      validateCommunityRoleMutation({
        membershipState: "following",
        role: "coordinator",
      }),
    ).toMatchObject({ ok: false, reason: "membership_not_active" });
    expect(
      validateCommunityRoleMutation({
        membershipState: "member",
        role: "root",
      }),
    ).toMatchObject({ ok: false, reason: "invalid_role" });
    expect(
      validateCommunityRoleMutation({
        membershipState: "member",
        role: "facilitator",
      }),
    ).toEqual({ ok: true });
  });

  it("impede inserir membro de outra comunidade no grupo", () => {
    expect(
      validateCommunityGroupMember({
        membershipState: "member",
        membershipCommunityId: "a",
        groupCommunityId: "b",
      }),
    ).toMatchObject({ ok: false, reason: "community_mismatch" });
    expect(
      validateCommunityGroupMember({
        membershipState: "member",
        membershipCommunityId: "a",
        groupCommunityId: "a",
      }),
    ).toEqual({ ok: true });
  });
});
