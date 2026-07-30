import { describe, expect, it } from "vitest";
import {
  canAssumeOperationalItem,
  canReceiveOperationalAssignment,
  requiresExplicitReassignmentConfirmation,
} from "./operational-responsibility";

const profile = (role: string | null, admin = false) =>
  ({
    id: "11111111-1111-4111-8111-111111111111",
    role: admin ? "admin" : "editor",
    operational_role: role,
    active: true,
  }) as any;

describe("operational responsibility", () => {
  it("allows an authorized role to assume without a second confirmation", () => {
    expect(
      canAssumeOperationalItem(profile("rights_reviewer"), {
        requiredRole: "rights_reviewer",
        state: "pending",
      }),
    ).toBe(true);
  });

  it("does not broaden permissions through assignment", () => {
    expect(
      canAssumeOperationalItem(profile("contribution_reviewer"), {
        requiredRole: "rights_reviewer",
        state: "pending",
      }),
    ).toBe(false);
    expect(canReceiveOperationalAssignment("viewer", "rights_reviewer")).toBe(
      false,
    );
  });

  it("requires confirmation only for the protected reassignment cases", () => {
    expect(
      requiresExplicitReassignmentConfirmation({
        priority: 3,
        hasActiveResponsible: false,
        assigningSelf: true,
        cancellingUnfinished: false,
      }),
    ).toBe(false);
    expect(
      requiresExplicitReassignmentConfirmation({
        priority: 1,
        hasActiveResponsible: true,
        assigningSelf: false,
        cancellingUnfinished: false,
      }),
    ).toBe(true);
  });

  it("fails closed for resolved work", () => {
    expect(
      canAssumeOperationalItem(profile("operations_admin"), {
        requiredRole: "operations_admin",
        state: "resolved",
      }),
    ).toBe(false);
  });
});
