import { describe, expect, it } from "vitest";
import {
  buildSidewalkPilotInviteUrl,
  sidewalkPilotPhase,
  summarizeSidewalkPilot,
} from "./sidewalk-pilot";

const now = new Date("2026-08-02T12:00:00.000Z");

describe("sidewalk pilot", () => {
  it("classifica as fases do piloto", () => {
    expect(sidewalkPilotPhase(new Date("2026-07-30T02:59:00.000Z"))).toBe(
      "preparing",
    );
    expect(sidewalkPilotPhase(now)).toBe("active");
    expect(sidewalkPilotPhase(new Date("2026-08-06T03:00:00.000Z"))).toBe(
      "closed",
    );
  });

  it("calcula funil, retorno, SLA e bairros sem expor identidade", () => {
    const summary = summarizeSidewalkPilot(
      {
        uploads: [
          {
            member_user_id: "member-a",
            status: "confirmed",
            created_at: "2026-07-31T10:00:00.000Z",
            record_id: "record-a",
          },
          {
            member_user_id: "member-a",
            status: "confirmed",
            created_at: "2026-08-01T10:00:00.000Z",
            record_id: "record-b",
          },
          {
            member_user_id: "member-b",
            status: "awaiting_upload",
            failure_code: "signed_url",
            created_at: "2026-08-01T11:00:00.000Z",
          },
        ],
        records: [
          {
            id: "record-a",
            status: "published",
            visibility: "public",
            created_at: "2026-07-31T10:05:00.000Z",
            updated_at: "2026-07-31T18:00:00.000Z",
            inferred_neighborhood: "Retiro",
          },
          {
            id: "record-b",
            status: "under_review",
            visibility: "internal",
            created_at: "2026-08-01T10:05:00.000Z",
            updated_at: "2026-08-01T10:05:00.000Z",
            inferred_neighborhood: "Santa Cruz",
          },
        ],
        photos: [
          { record_id: "record-a", review_status: "approved", is_public: true },
          { record_id: "record-b", review_status: "pending", is_public: false },
        ],
      },
      now,
    );

    expect(summary.phase).toBe("active");
    expect(summary.metrics.authorized).toBe(3);
    expect(summary.metrics.confirmed).toBe(2);
    expect(summary.metrics.participants).toBe(2);
    expect(summary.metrics.returningParticipants).toBe(1);
    expect(summary.metrics.returnRatePct).toBe(50);
    expect(summary.metrics.published).toBe(1);
    expect(summary.metrics.pendingPhotos).toBe(1);
    expect(summary.metrics.neighborhoods).toEqual([
      { name: "Retiro", count: 1 },
      { name: "Santa Cruz", count: 1 },
    ]);
    expect(JSON.stringify(summary)).not.toContain("member-a");
    expect(summary.findings).toContain("technical_failures_above_limit");
    expect(summary.findings).toContain("completion_below_target");
  });

  it("ignora registros fora da janela e falhas de limpeza", () => {
    const summary = summarizeSidewalkPilot(
      {
        uploads: [
          {
            member_user_id: "old",
            status: "confirmed",
            created_at: "2026-07-29T00:00:00.000Z",
            record_id: "old-record",
          },
          {
            member_user_id: "current",
            status: "abandoned",
            failure_code: "expired_cleanup_marked",
            created_at: "2026-08-01T00:00:00.000Z",
          },
        ],
        records: [],
        photos: [],
      },
      now,
    );
    expect(summary.metrics.authorized).toBe(1);
    expect(summary.metrics.technicalFailures).toBe(0);
  });

  it("gera convite territorial sem dados pessoais", () => {
    const url = buildSidewalkPilotInviteUrl("Vila Rica/Tiradentes");
    expect(url).toContain("origem=calcadas");
    expect(url).toContain("piloto=calcadas-vr-piloto-01");
    expect(url).toContain("bairro=Vila+Rica%2FTiradentes");
  });
});
