import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("./summarize-session.mjs", import.meta.url),
);
const fixture = () =>
  [0, 1, 2].map((i) => ({
    schemaVersion: 1,
    sessionId: randomUUID(),
    consented: true,
    completed: true,
    tasks: [
      { category: "intro", success: true, seconds: 10 + i * 20 },
      { category: "contribution", success: false, seconds: 20 + i * 20 },
    ],
    privateNotes: "private-sentinel",
  }));

async function runFixture(rows, duplicatePath = false) {
  const dir = await mkdtemp(path.join(tmpdir(), "comun-human-sessions-"));
  try {
    const files = [];
    for (const [i, row] of rows.entries()) {
      const file = path.join(dir, `${i}.json`);
      await writeFile(
        file,
        typeof row === "string" ? row : JSON.stringify(row),
      );
      files.push(file);
    }
    return spawnSync(
      process.execPath,
      [script, ...(duplicatePath ? [files[0], files[0], files[0]] : files)],
      { encoding: "utf8", timeout: 5000 },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function expectBlocked(rows, duplicatePath = false) {
  const run = await runFixture(rows, duplicatePath);
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(
    run.stderr.trim(),
    "COMUN_HUMAN_GATE_SESSION_EVIDENCE_INCOMPLETE",
  );
}

test("três registros distintos produzem denominadores e média completos", async () => {
  const rows = fixture();
  const run = await runFixture(rows);
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.sessions, 3);
  assert.equal(summary.tasks, 6);
  assert.equal(summary.successes, 3);
  assert.equal(summary.successRate, 0.5);
  assert.equal(summary.averageTaskSeconds, 35);
  assert.deepEqual(summary.categories, { intro: 3, contribution: 3 });
  assert.equal(summary.evidenceScope, "declared_session_records");
  assert.equal(summary.participantIndependence, "not_verified");
  assert.equal(summary.launchPublicly, "not_invoked");
  assert.doesNotMatch(run.stdout, /private-sentinel/);
  for (const row of rows) assert.ok(!run.stdout.includes(row.sessionId));
});

test("repetir o mesmo caminho não cria três sessões", () =>
  expectBlocked(fixture(), true));
test("arquivos distintos com ID duplicado não criam três sessões", () => {
  const rows = fixture();
  rows[1].sessionId = rows[0].sessionId;
  return expectBlocked(rows);
});
for (const [name, mutate] of [
  [
    "ID ausente",
    (row) => {
      delete row.sessionId;
    },
  ],
  [
    "ID vazio",
    (row) => {
      row.sessionId = " ";
    },
  ],
  [
    "schema desconhecido",
    (row) => {
      row.schemaVersion = 2;
    },
  ],
  [
    "sem consentimento",
    (row) => {
      row.consented = false;
    },
  ],
  [
    "incompleta",
    (row) => {
      row.completed = false;
    },
  ],
  [
    "tarefas ausentes",
    (row) => {
      delete row.tasks;
    },
  ],
  [
    "tarefas vazias",
    (row) => {
      row.tasks = [];
    },
  ],
  [
    "tempo ausente",
    (row) => {
      delete row.tasks[0].seconds;
    },
  ],
  [
    "tempo null",
    (row) => {
      row.tasks[0].seconds = null;
    },
  ],
  [
    "tempo negativo",
    (row) => {
      row.tasks[0].seconds = -1;
    },
  ],
  [
    "tempo em texto",
    (row) => {
      row.tasks[0].seconds = "10";
    },
  ],
  [
    "sucesso não registrado",
    (row) => {
      delete row.tasks[0].success;
    },
  ],
  [
    "sucesso em texto",
    (row) => {
      row.tasks[0].success = "true";
    },
  ],
  [
    "tarefa null",
    (row) => {
      row.tasks[0] = null;
    },
  ],
  [
    "categoria inválida",
    (row) => {
      row.tasks[0].category = {};
    },
  ],
]) {
  test(`sessão com ${name} bloqueia relatório parcial`, () => {
    const rows = fixture();
    mutate(rows[1]);
    return expectBlocked(rows);
  });
}
test("JSON inválido não expõe o conteúdo recebido", () =>
  expectBlocked([fixture()[0], "{private-sentinel", fixture()[2]]));
test("menos de três arquivos não gera resumo", () =>
  expectBlocked(fixture().slice(0, 2)));
test("overflow de tempos não gera média null", () => {
  const rows = fixture();
  for (const row of rows) for (const task of row.tasks) task.seconds = 1e308;
  return expectBlocked(rows);
});
test("categoria reservada é contada como propriedade própria", async () => {
  const rows = fixture();
  rows[0].tasks[0].category = "__proto__";
  const run = await runFixture(rows);
  assert.equal(run.status, 0);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.categories["__proto__"], 1);
});

test("tempo zero medido e categoria ausente mantêm a contagem correta", async () => {
  const rows = fixture();
  rows[0].tasks[0].seconds = 0;
  delete rows[0].tasks[0].category;
  const run = await runFixture(rows);
  assert.equal(run.status, 0);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.tasks, 6);
  assert.equal(summary.averageTaskSeconds, 200 / 6);
  assert.equal(summary.categories.unclassified, 1);
});
