import { describe, expect, it } from "vitest";
import { projectInboxContext } from "./member-inbox-context";

describe("projectInboxContext", () => {
  it("preserva a origem do mapa e o destino canônico", () => {
    expect(
      projectInboxContext({
        notification_type: "sidewalk_result_registered",
        action_url: "/comun/calcadas/resultados",
        created_at: "2026-07-21T10:00:00Z",
        priority: "attention",
      }),
    ).toMatchObject({
      sourceLabel: "Mapa das Calçadas",
      entityType: "registro",
      destination: "/comun/calcadas/resultados",
    });
  });
  it("não confunde transporte com calçadas", () => {
    expect(
      projectInboxContext({
        notification_type: "transport_update",
        action_url: "/comun/pautas/transporte",
        created_at: "2026-07-21T10:00:00Z",
        priority: "normal",
      }).sourceLabel,
    ).toBe("Transporte");
  });
});
