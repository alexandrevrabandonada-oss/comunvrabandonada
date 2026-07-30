import { describe, expect, it } from "vitest";
import {
  isCommunityMembershipReviewReplay,
  resolveCommunitySelfServiceState,
  validateCommunityGroupMember,
  validateCommunityMembershipReview,
  validateCommunityPautaContext,
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

  it("impede que a pessoa solicitante aprove a própria entrada", () => {
    expect(
      validateCommunityMembershipReview({
        operationState: "pending",
        membershipState: "following",
        decision: "approve",
        actorUserId: "same-user",
        memberUserId: "same-user",
      }),
    ).toMatchObject({ ok: false, reason: "self_approval_forbidden" });
    expect(
      validateCommunityMembershipReview({
        operationState: "pending",
        membershipState: "following",
        decision: "approve",
        actorUserId: "reviewer",
        memberUserId: "requester",
      }),
    ).toEqual({ ok: true });
  });

  it("reconhece repetição da mesma decisão sem duplicar efeitos", () => {
    expect(
      isCommunityMembershipReviewReplay({
        operationState: "resolved",
        matchingDecisionEventExists: true,
      }),
    ).toBe(true);
    expect(
      isCommunityMembershipReviewReplay({
        operationState: "resolved",
        matchingDecisionEventExists: false,
      }),
    ).toBe(false);
    expect(
      isCommunityMembershipReviewReplay({
        operationState: "pending",
        matchingDecisionEventExists: true,
      }),
    ).toBe(false);
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

  it("vincula grupo somente à pauta da comunidade canônica", () => {
    expect(
      validateCommunityPautaContext({
        communitySlug: "vila-rica",
        pautaCommunitySlug: "retiro",
      }),
    ).toMatchObject({ ok: false, reason: "community_mismatch" });
    expect(
      validateCommunityPautaContext({
        communitySlug: "vila-rica",
        pautaCommunitySlug: null,
      }),
    ).toMatchObject({ ok: false, reason: "pauta_without_community" });
    expect(
      validateCommunityPautaContext({
        communitySlug: "vila-rica",
        pautaCommunitySlug: "vila-rica",
      }),
    ).toEqual({ ok: true });
  });
});
