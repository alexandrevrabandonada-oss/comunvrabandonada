import { describe, expect, it } from "vitest";
import { routeRelata } from "./comun-relata-routing";
import {
  HEALTH_ISSUE_TYPE_QUESTION,
  routeHealthServiceV1,
} from "./comun-health-service-routing-v1";

const enabled = { publicHealthSensitiveRoutingEnabled: true };

describe("COMUN P6C-A health service routing v1", () => {
  it.each([
    ["A UBS está sem médico hoje.", "staff_or_service_availability"],
    ["Estou aguardando cirurgia há meses.", "exam_or_procedure"],
    ["Está faltando medicamento na farmácia da unidade.", "medicine_or_supply"],
    ["O banheiro da UPA está quebrado e não tem acessibilidade.", "facility_or_accessibility"],
    ["Não fui atendido e ninguém informa quando será a consulta.", "access_or_waiting"],
    ["O transporte sanitário entre as unidades não chegou.", "transfer_or_health_transport"],
    ["O atendimento na UBS foi desrespeitoso.", "care_conduct"],
  ])("classifies the service problem without diagnosing: %s", (text, subtype) => {
    expect(routeRelata({ text }, enabled)).toMatchObject({
      category: "public_health",
      healthIssueType: subtype,
      privacyClass: "sensitive",
      publication: "never_automatic",
      routingVersion: "comun-health-service-routing-v1",
    });
  });

  it("does not classify the word hospital alone without a service problem", () => {
    expect(routeHealthServiceV1({ text: "Passei perto do hospital ontem." })).toBeNull();
  });

  it("marks identifiable clinical context high-risk without inferring a diagnosis", () => {
    const decision = routeRelata(
      { text: "Meu exame na UBS não foi liberado." },
      enabled,
    );
    expect(decision).toMatchObject({
      category: "public_health",
      privacyClass: "high_risk",
      publication: "never_automatic",
    });
    expect(decision.explanation.toLocaleLowerCase("pt-BR")).not.toMatch(
      /diagnóstico|doença|prognóstico/,
    );
  });

  it("separates urgent care guidance from an ombudsman and keeps capture available", () => {
    expect(routeRelata({ text: "Preciso de atendimento imediato." }, enabled)).toMatchObject({
      category: "public_health",
      urgency: "emergency",
      nextStep: expect.stringContaining("SAMU 192"),
      missingInformation: [],
      publication: "never_automatic",
    });
  });

  it("uses a typed, optional question only when the subtype is unclear", () => {
    const decision = routeRelata(
      { text: "Há um problema no atendimento do SUS." },
      enabled,
    );
    expect(decision.adaptiveQuestion).toEqual(HEALTH_ISSUE_TYPE_QUESTION);
    expect(decision.adaptiveQuestion?.blocking).toBe(false);

    const answered = routeRelata(
      {
        text: "Há um problema no atendimento do SUS.",
        answers: { health_issue_type: "information_or_followup" },
      },
      enabled,
    );
    expect(answered).toMatchObject({
      category: "public_health",
      healthIssueType: "information_or_followup",
      adaptiveQuestion: null,
    });
  });

  it("keeps matched signal codes internal to the composed browser decision", () => {
    const internal = routeHealthServiceV1({ text: "A UBS está sem médico." });
    expect(internal?.matchedSignals).toContain("health.staff.no_doctor");
    const browserDecision = routeRelata(
      { text: "A UBS está sem médico." },
      enabled,
    );
    expect(browserDecision).not.toHaveProperty("matchedSignals");
  });

  it("does not infer health from photo-only capture", () => {
    expect(
      routeRelata(
        {
          text: "Observação registrada a partir de uma foto, sem descrição textual.",
          hasAttachment: true,
        },
        enabled,
      ),
    ).toMatchObject({ category: "other", publication: "never_automatic" });
  });
});
