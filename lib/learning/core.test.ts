import { describe, expect, it } from "vitest";
import {
  catalog,
  nextMission,
  trackProgress,
  type Progress,
  type Practice,
} from "./core";
const p = (
  mission_id: string,
  step: number,
  status: Progress["status"],
): Progress => ({
  mission_id,
  step,
  status,
  revision: 1,
  updated_at: "2026-10-06T10:00:00Z",
});
describe("Escola next action", () => {
  it("has 24 missions, 9 practices and two valid challenges per mission", () => {
    expect(catalog.missions).toHaveLength(24);
    expect(catalog.missions.filter((m) => m.requiresPractice)).toHaveLength(9);
    for (const m of catalog.missions) {
      expect(m.challenges).toHaveLength(2);
      for (const c of m.challenges) expect(c.options[c.answer]).toBeTruthy();
    }
  });
  it("resumes started missions", () => {
    const m = catalog.missions[2];
    expect(nextMission([p(m.id, 2, "started")])?.mission.id).toBe(m.id);
  });
  it("prioritizes actionable practices while allowing study during review", () => {
    const m = catalog.missions[0];
    const progress = [p(m.id, 5, "practice_pending")];
    expect(nextMission(progress)?.reason).toBe("practice");
    const practice = { mission_id: m.id, state: "pending" } as Practice;
    expect(nextMission(progress, [practice])?.mission.id).toBe(
      catalog.missions[1].id,
    );
    expect(
      nextMission(progress, [{ ...practice, state: "revision_requested" }])
        ?.reason,
    ).toBe("practice");
  });
  it("keeps content and validated practice totals separate", () => {
    const m = catalog.missions[0];
    expect(
      trackProgress("fundamentos", [p(m.id, 5, "practice_pending")]),
    ).toMatchObject({ learned: 1, practiceCompleted: 0 });
    expect(
      trackProgress("fundamentos", [p(m.id, 5, "completed")]).practiceCompleted,
    ).toBe(1);
  });
});
