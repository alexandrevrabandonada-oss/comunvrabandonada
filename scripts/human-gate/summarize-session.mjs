import { readFile } from "node:fs/promises";

const files = process.argv.slice(2);
if (files.length !== 3) throw new Error("Exactly three real session files are required");
const sessions = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
if (sessions.some((session) => session.consented !== true || session.completed !== true)) {
  throw new Error("All three sessions must be consented and completed");
}

const categories = {};
let taskCount = 0;
let successCount = 0;
let totalSeconds = 0;
for (const session of sessions) {
  for (const task of session.tasks || []) {
    taskCount += 1;
    if (task.success === true) successCount += 1;
    if (Number.isFinite(task.seconds)) totalSeconds += task.seconds;
    const category = task.category || "unclassified";
    categories[category] = (categories[category] || 0) + 1;
  }
}

console.log(JSON.stringify({
  sessions: 3,
  tasks: taskCount,
  successes: successCount,
  successRate: taskCount ? successCount / taskCount : 0,
  averageTaskSeconds: taskCount ? totalSeconds / taskCount : 0,
  categories,
}, null, 2));

