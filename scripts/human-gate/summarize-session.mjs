import { readFile } from "node:fs/promises";

try {
  const files = process.argv.slice(2);
  if (files.length !== 3) throw new Error("incomplete");
  const sessions = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(file, "utf8"))),
  );
  const sessionIds = new Set();
  const categories = Object.create(null);
  let taskCount = 0;
  let successCount = 0;
  let totalSeconds = 0;
  for (const session of sessions) {
    if (
      !session ||
      session.schemaVersion !== 1 ||
      session.consented !== true ||
      session.completed !== true ||
      typeof session.sessionId !== "string" ||
      !session.sessionId.trim() ||
      sessionIds.has(session.sessionId.trim()) ||
      !Array.isArray(session.tasks) ||
      session.tasks.length === 0
    )
      throw new Error("incomplete");
    sessionIds.add(session.sessionId.trim());
    for (const task of session.tasks) {
      if (
        !task ||
        typeof task.success !== "boolean" ||
        !Number.isFinite(task.seconds) ||
        task.seconds < 0
      )
        throw new Error("incomplete");
      const category = task.category ?? "unclassified";
      if (typeof category !== "string" || !category.trim())
        throw new Error("incomplete");
      taskCount += 1;
      if (task.success) successCount += 1;
      totalSeconds += task.seconds;
      if (!Number.isFinite(totalSeconds)) throw new Error("incomplete");
      categories[category] = (categories[category] || 0) + 1;
    }
  }
  console.log(
    JSON.stringify(
      {
        sessions: sessionIds.size,
        tasks: taskCount,
        successes: successCount,
        successRate: successCount / taskCount,
        averageTaskSeconds: totalSeconds / taskCount,
        categories,
        evidenceScope: "declared_session_records",
        participantIndependence: "not_verified",
        launchPublicly: "not_invoked",
      },
      null,
      2,
    ),
  );
} catch {
  console.error("COMUN_HUMAN_GATE_SESSION_EVIDENCE_INCOMPLETE");
  process.exitCode = 1;
}
