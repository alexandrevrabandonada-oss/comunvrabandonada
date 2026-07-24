import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const session = {
  schemaVersion: 1,
  sessionId: randomUUID(),
  consented: false,
  completed: false,
  date: null,
  device: null,
  tasks: [],
  closing: {},
};

if (output) {
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(session, null, 2)}\n`, { flag: "wx" });
  console.log(`HUMAN_GATE_SESSION_CREATED ${session.sessionId}`);
} else {
  console.log(JSON.stringify(session, null, 2));
}
