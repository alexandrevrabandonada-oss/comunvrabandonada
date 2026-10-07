import { nextMission, missionHref, SCHOOL_PATH, type Snapshot } from "./core";

// A projection of the existing owner snapshot, never another progress model.
export function learningContinuity(snapshot: Snapshot) {
  const next = nextMission(snapshot.progress, snapshot.practices);
  if (next?.reason === "resume" || next?.reason === "practice") {
    if (!next.mission) throw new Error("learning_unavailable");
    const progress = snapshot.progress.find(
      (entry) => entry.mission_id === next.mission.id,
    );
    if (
      !progress ||
      !Number.isInteger(progress.step) ||
      progress.step < 0 ||
      progress.step > 5
    )
      throw new Error("learning_unavailable");
    return {
      kind: next.reason,
      title: next.mission.title,
      stage: progress.step + 1,
      href: missionHref(next.mission.id),
    };
  }
  if (snapshot.practices.some((practice) => practice.state === "pending"))
    return { kind: "review" as const, href: `${SCHOOL_PATH}/pratica` };
  return { kind: "empty" as const, href: SCHOOL_PATH };
}
