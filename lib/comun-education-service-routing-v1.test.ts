import { describe, expect, it } from "vitest";
import { routeRelata } from "./comun-relata-routing";
import {
  EDUCATION_ISSUE_TYPE_QUESTION,
  routeEducationServiceV1,
} from "./comun-education-service-routing-v1";

const enabled = { publicEducationSensitiveRoutingEnabled: true };

describe("COMUN P6C-B1 education service routing v1", () => {
  it.each([
    [
      "A escola está sem professor há semanas.",
      "staff_or_service_availability",
      "restricted",
    ],
    [
      "As salas estão sem ventilador e muito quentes.",
      "infrastructure_or_climate",
      "restricted",
    ],
    ["A escola está sem merenda.", "school_meals_or_supplies", "restricted"],
    [
      "O transporte escolar não passou.",
      "school_transport_or_access",
      "restricted",
    ],
    [
      "A escola não tem rampa nem banheiro acessível.",
      "accessibility_or_inclusion",
      "sensitive",
    ],
    [
      "Não consigo vaga para matrícula.",
      "enrollment_or_attendance",
      "restricted",
    ],
    [
      "A escola não informa quando as aulas voltam.",
      "information_or_management",
      "restricted",
    ],
    [
      "Um estudante está sofrendo bullying.",
      "discrimination_or_bullying",
      "high_risk",
    ],
  ])(
    "classifies the education service problem: %s",
    (text, subtype, privacyClass) => {
      expect(routeRelata({ text }, enabled)).toMatchObject({
        category: "public_education",
        educationIssueType: subtype,
        privacyClass,
        publication: "never_automatic",
        requiresHumanReview: true,
        routingVersion: "comun-education-service-routing-v1",
        missingInformation: [],
      });
    },
  );

  it("separates an education service problem from a labor claim", () => {
    expect(
      routeRelata({ text: "O professor não recebe salário." }, enabled),
    ).toMatchObject({
      category: "workplace",
    });
    expect(
      routeRelata({ text: "A escola está sem professor." }, enabled),
    ).toMatchObject({
      category: "public_education",
    });
  });

  it("separates school transport from an ordinary bus line", () => {
    expect(
      routeRelata(
        { text: "O transporte escolar não buscou os alunos." },
        enabled,
      ),
    ).toMatchObject({
      category: "public_education",
      educationIssueType: "school_transport_or_access",
    });
    expect(
      routeRelata({ text: "O ônibus da linha 205 não passou." }, enabled),
    ).toMatchObject({
      category: "public_transport",
    });
  });

  it("raises a separate child-safety signal without inventing a category", () => {
    const decision = routeRelata(
      { text: "Um adulto agrediu uma criança na escola." },
      enabled,
    );
    expect(decision).toMatchObject({
      category: "public_education",
      childSafetySignal: true,
      privacyClass: "high_risk",
      requiresHumanReview: true,
      publication: "never_automatic",
    });
    expect(decision.nextStep).toContain("rede de proteção");
    expect(decision.nextStep).toContain("não acionou ninguém");
  });

  it("uses a typed optional question and never blocks capture", () => {
    const decision = routeRelata(
      { text: "Há um problema na escola pública." },
      enabled,
    );
    expect(decision.adaptiveQuestion).toEqual(EDUCATION_ISSUE_TYPE_QUESTION);
    expect(decision.adaptiveQuestion?.blocking).toBe(false);
    expect(decision.missingInformation).toEqual([]);

    expect(
      routeRelata(
        {
          text: "Há um problema na escola pública.",
          answers: { education_issue_type: "school_meals_or_supplies" },
        },
        enabled,
      ),
    ).toMatchObject({
      category: "public_education",
      educationIssueType: "school_meals_or_supplies",
      adaptiveQuestion: null,
    });
  });

  it("keeps matched signals inside the server router", () => {
    expect(
      routeEducationServiceV1({ text: "A escola está sem merenda." })
        ?.matchedSignals,
    ).toContain("education.meals.none");
    expect(
      routeRelata({ text: "A escola está sem merenda." }, enabled),
    ).not.toHaveProperty("matchedSignals");
  });

  it("does not infer education from photo-only capture", () => {
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
