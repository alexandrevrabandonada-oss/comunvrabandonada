import { describe, expect, it } from "vitest";
import { routeChildProtectionV1 } from "./comun-child-protection-routing-v1";
import { routeRelata } from "./comun-relata-routing";

const enabled = {
  publicEducationSensitiveRoutingEnabled: true,
  childProtectionPrivateRoutingEnabled: true,
};

describe("COMUN P6C-B2 child protection routing", () => {
  it("routes immediate danger with maximum privacy", () => {
    const decision = routeRelata(
      { text: "Uma criança pode estar em perigo imediato." },
      enabled,
    );
    expect(decision).toMatchObject({
      category: "child_protection",
      urgency: "emergency",
      privacyClass: "high_risk",
      publication: "never_automatic",
      requiresHumanReview: true,
      childProtectionIssueType: "immediate_danger",
      immediateDanger: true,
      routingVersion: "comun-child-protection-routing-v1",
    });
  });

  it("recognizes a serious rights concern and asks only an optional urgency question", () => {
    const decision = routeRelata(
      {
        text: "Há suspeita de uma violação grave dos direitos de uma criança.",
      },
      enabled,
    );
    expect(decision.category).toBe("child_protection");
    expect(decision.privacyClass).toBe("high_risk");
    expect(decision.adaptiveQuestion).toMatchObject({
      id: "child_immediate_danger",
      answerKey: "child_immediate_danger",
      blocking: false,
    });
  });

  it("keeps ordinary education, bullying without danger, and labor separate", () => {
    expect(
      routeRelata({ text: "A escola está sem professor." }, enabled).category,
    ).toBe("public_education");
    expect(
      routeRelata(
        {
          text: "Um estudante relatou bullying, sem indicação de perigo imediato.",
        },
        enabled,
      ),
    ).toMatchObject({
      category: "public_education",
      educationIssueType: "discrimination_or_bullying",
      privacyClass: "high_risk",
    });
    expect(
      routeRelata({ text: "Professor está sem receber salário." }, enabled)
        .category,
    ).toBe("workplace");
  });

  it("requires an unequivocal expression or contextual combination", () => {
    expect(
      routeChildProtectionV1({ text: "A criança estuda aqui." }),
    ).toBeNull();
    expect(
      routeRelata(
        {
          text: "Há uma situação séria de proteção envolvendo uma criança na escola.",
        },
        enabled,
      ).category,
    ).toBe("child_protection");
  });

  it("does not infer protection from photo-only absence", () => {
    expect(
      routeChildProtectionV1({ text: "", hasAttachment: true }),
    ).toBeNull();
  });

  it("keeps internal matched signals out of the browser decision", () => {
    const decision = routeRelata(
      { text: "Há uma situação grave de proteção envolvendo uma criança." },
      enabled,
    );
    expect(decision).not.toHaveProperty("matchedSignals");
  });
});
