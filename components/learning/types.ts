import type { Snapshot } from "@/lib/learning/core";
export type SchoolSnapshot = Snapshot & {
  pautas: { id: string; slug: string; title: string }[];
  tasks: { id: string; pauta_id: string; title: string; status: string }[];
};
export type Event =
  | {
      event: "continue" | "answer";
      missionId: string;
      revision: number;
      answer?: number;
    }
  | {
      event: "practice";
      missionId: string;
      pautaId: string;
      taskId: string | null;
      reflection: string;
    }
  | { event: "bookmark"; resourceId: string };
