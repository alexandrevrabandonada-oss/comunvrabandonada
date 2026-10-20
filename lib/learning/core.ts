import data from "./catalog.json";

export const catalog = data;
export type Mission = (typeof catalog.missions)[number];
export type LearningStatus = "started" | "practice_pending" | "completed";
export type Progress = {
  mission_id: string;
  step: number;
  revision: number;
  status: LearningStatus;
  updated_at: string;
};
export type Practice = {
  mission_id: string;
  pauta_id: string;
  task_id: string | null;
  reflection: string;
  state: "pending" | "validated" | "revision_requested";
  review_note: string | null;
};
export type Snapshot = {
  progress: Progress[];
  practices: Practice[];
  savedResources: string[];
};
export const emptySnapshot: Snapshot = {
  progress: [],
  practices: [],
  savedResources: [],
};
export const SCHOOL_PATH = "/comun/escola";
export function isLearningEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.COMUN_LEARNING_R0_ENABLED === "enabled";
}
export function getMission(id: string) {
  return catalog.missions.find((mission) => mission.id === id);
}
export function missionHref(id: string) {
  return `${SCHOOL_PATH}/missao/${id}`;
}
export function nextMission(progress: Progress[], practices: Practice[] = []) {
  const pending = progress
    .filter(
      (p) =>
        p.status === "practice_pending" &&
        !practices.some(
          (practice) =>
            practice.mission_id === p.mission_id &&
            practice.state === "pending",
        ),
    )
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))[0];
  if (pending)
    return {
      mission: getMission(pending.mission_id)!,
      reason: "practice" as const,
    };
  const started = progress
    .filter((p) => p.step < 5)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (started)
    return {
      mission: getMission(started.mission_id)!,
      reason: "resume" as const,
    };
  const mission = catalog.missions.find(
    (m) => !progress.some((p) => p.mission_id === m.id && p.step === 5),
  );
  return mission ? { mission, reason: "next" as const } : null;
}
export function trackProgress(track: string, progress: Progress[]) {
  const missions = catalog.missions.filter((m) => m.track === track);
  return {
    total: missions.length,
    learned: missions.filter((m) =>
      progress.some((p) => p.mission_id === m.id && p.step === 5),
    ).length,
    practiceTotal: missions.filter((m) => m.requiresPractice).length,
    practiceCompleted: missions.filter(
      (m) =>
        m.requiresPractice &&
        progress.some((p) => p.mission_id === m.id && p.status === "completed"),
    ).length,
  };
}
export function checkAnswer(mission: Mission, step: number, answer: number) {
  const challenge = mission.challenges[step === 1 ? 0 : 1];
  return { correct: answer === challenge.answer, feedback: challenge.feedback };
}
