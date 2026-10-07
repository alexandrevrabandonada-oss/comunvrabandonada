import { describe, expect, it } from "vitest";
import { catalog, type Snapshot } from "./core";
import { learningContinuity } from "./continuity";

const mission = catalog.missions[0];
const snapshot = (step = 2, status = "started"): Snapshot => ({
  progress: [
    {
      mission_id: mission.id,
      step,
      revision: 7,
      status,
      updated_at: "2026-10-07T10:00:00Z",
    },
  ] as Snapshot["progress"],
  practices: [],
  savedResources: [],
});

describe("owner learning continuity without another progress model", () => {
  it("never claims that an empty snapshot already started training", () => {
    expect(
      learningContinuity({ progress: [], practices: [], savedResources: [] }),
    ).toEqual({ kind: "empty", href: "/comun/escola" });
  });
  it("resumes the persisted stage using the canonical mission selector", () => {
    expect(learningContinuity(snapshot())).toEqual({
      kind: "resume",
      title: mission.title,
      stage: 3,
      href: `/comun/escola/missao/${mission.id}`,
    });
  });
  it("separates a practice still to submit from one awaiting review", () => {
    const own = snapshot(5, "practice_pending");
    expect(learningContinuity(own).kind).toBe("practice");
    own.practices = [
      {
        mission_id: mission.id,
        state: "pending",
        reflection: "private reflection",
        review_note: "private note",
        pauta_id: "private-pauta",
        task_id: "private-task",
      },
    ];
    expect(learningContinuity(own)).toEqual({
      kind: "review",
      href: "/comun/escola/pratica",
    });
  });
  it("does not silently repeat a completed activity", () => {
    expect(learningContinuity(snapshot(5, "completed"))).toEqual({
      kind: "empty",
      href: "/comun/escola",
    });
  });
  it("projects only public catalog content and a private progress counter", () => {
    const own = snapshot();
    own.practices = [
      {
        mission_id: "other",
        state: "pending",
        reflection: "private reflection",
        review_note: "private note",
        pauta_id: "private-pauta",
        task_id: "private-task",
      },
    ];
    const before = structuredClone(own);
    expect(Object.keys(learningContinuity(own)).sort()).toEqual([
      "href",
      "kind",
      "stage",
      "title",
    ]);
    expect(JSON.stringify(learningContinuity(own))).not.toMatch(
      /private-|reflection|review_note|pauta_id|task_id|revision|updated_at/,
    );
    expect(own).toEqual(before);
  });
  it("refuses unknown mission handles and invalid stages rather than constructing a destination", () => {
    const own = snapshot();
    own.progress[0].mission_id = "../../private-person";
    expect(() => learningContinuity(own)).toThrow("learning_unavailable");
    expect(() => learningContinuity(snapshot(-1))).toThrow(
      "learning_unavailable",
    );
  });
});
