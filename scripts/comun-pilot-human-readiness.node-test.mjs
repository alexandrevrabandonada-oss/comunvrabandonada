import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const roles = [
  "coordenacao",
  "contribuicoes",
  "privacidade",
  "direitos",
  "facilitacao",
  "protocolo",
  "resultados",
  "suporte_tecnico",
];
const flags = [
  "primary_confirmed",
  "substitute_confirmed",
  "coverage_window_confirmed",
  "escalation_channel_confirmed",
  "training_confirmed",
  "access_reviewed",
];
const fixture = () =>
  roles.map((role) => ({
    role,
    ...Object.fromEntries(flags.map((key) => [key, true])),
    confirmed_at: "2026-10-01T12:00:00Z",
    confirmed_by: "synthetic-confirmer",
  }));

async function runBoth(value) {
  const dir = await mkdtemp(path.join(tmpdir(), "comun-human-readiness-"));
  try {
    if (value !== undefined) {
      await mkdir(path.join(dir, ".local/comun"), { recursive: true });
      await writeFile(
        path.join(dir, ".local/comun/pilot-human-readiness.json"),
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
    const env = { ...process.env };
    for (const key of ["VERCEL", "SUPABASE_PROJECT_ID", "R2_ENDPOINT"])
      delete env[key];
    return [
      "check-comun-pilot-human-readiness.mjs",
      "comun-pilot-go-no-go-local.mjs",
    ].map((file) =>
      spawnSync(process.execPath, [path.join(root, "scripts", file)], {
        cwd: dir,
        env,
        encoding: "utf8",
        timeout: 5000,
      }),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function expectIncomplete(value) {
  const [diagnostic, decision] = await runBoth(value);
  assert.equal(diagnostic.status, 0, diagnostic.stderr);
  assert.equal(
    diagnostic.stdout.trim(),
    "COMUN_PILOT_HUMAN_READINESS_INCOMPLETE",
  );
  assert.equal(decision.status, 0, decision.stderr);
  assert.equal(
    decision.stdout.trim(),
    "NO_GO_HUMAN_READINESS\nNO_AUTOMATIC_PROMOTION",
  );
}

test("oito funções com declarações completas mantêm o gate remoto pendente", async () => {
  const [diagnostic, decision] = await runBoth(fixture());
  assert.equal(diagnostic.status, 0);
  assert.equal(
    diagnostic.stdout.trim(),
    "COMUN_PILOT_HUMAN_READINESS_CONFIRMED",
  );
  assert.equal(
    decision.stdout.trim(),
    "NO_GO_REMOTE_REVIEW\nNO_AUTOMATIC_PROMOTION",
  );
});

for (const [name, input] of [
  ["arquivo ausente", undefined],
  ["JSON inválido", "{private-sentinel"],
  ["null", null],
  ["objeto em vez de lista", {}],
  ["linhas null", Array(8).fill(null)],
]) {
  test(`evidência ${name} fica incompleta sem crash ou exposição`, () =>
    expectIncomplete(input));
}

test("oito cópias da mesma função não cobrem a escala", () =>
  expectIncomplete(Array(8).fill(fixture()[0])));
test("papel vazio não é confirmação", () =>
  expectIncomplete(fixture().map((row) => ({ ...row, role: " " }))));
test("função desconhecida não substitui suporte técnico", () => {
  const rows = fixture();
  rows[7].role = "outro";
  return expectIncomplete(rows);
});
test("função duplicada adicional não é aceita", () => {
  const rows = fixture();
  return expectIncomplete([...rows, rows[0]]);
});

for (const key of flags) {
  test(`${key} exige true em todas as funções`, async () => {
    for (const value of [false, "true", undefined]) {
      const rows = fixture();
      rows[3][key] = value;
      await expectIncomplete(rows);
    }
  });
}

for (const [name, value] of [
  ["vazia", " "],
  ["ausente", undefined],
  ["nula", null],
  ["inexistente no calendário", "2026-02-31"],
  ["futura", "2099-01-01T00:00:00Z"],
  ["sem fuso", "2026-10-01T12:00:00"],
  ["hora inválida", "2026-10-01T24:00:00Z"],
]) {
  test(`data ${name} não comprova confirmação`, () => {
    const rows = fixture();
    rows[0].confirmed_at = value;
    return expectIncomplete(rows);
  });
}

for (const value of [
  "",
  " ",
  null,
  undefined,
  "TODO",
  "TBD",
  "pendente",
  "a definir",
]) {
  test(`confirmação por ${JSON.stringify(value)} fica pendente`, () => {
    const rows = fixture();
    rows[0].confirmed_by = value;
    return expectIncomplete(rows);
  });
}

test("rótulos documentados e data de calendário válida são compatíveis", async () => {
  const rows = fixture();
  const labels = [
    "Coordenação geral",
    "Revisão de contribuições",
    "Privacidade",
    "Direitos",
    "Facilitação",
    "Protocolo",
    "Resultados",
    "Suporte técnico",
  ];
  rows.forEach((row, i) => {
    row.role = labels[i];
    row.confirmed_at = "2026-10-01";
  });
  const [diagnostic, decision] = await runBoth(rows);
  assert.equal(
    diagnostic.stdout.trim(),
    "COMUN_PILOT_HUMAN_READINESS_CONFIRMED",
  );

  assert.equal(
    decision.stdout.trim(),
    "NO_GO_REMOTE_REVIEW\nNO_AUTOMATIC_PROMOTION",
  );
  assert.doesNotMatch(
    diagnostic.stdout + decision.stdout,
    /synthetic-confirmer/,
  );
});

test("aliases do mesmo papel também são duplicação", () => {
  const rows = fixture();
  rows[1].role = "Coordenação geral";
  return expectIncomplete(rows);
});

test("timestamp com fuso explícito é aceito", async () => {
  const rows = fixture();
  rows[0].confirmed_at = "2026-10-01T09:00:00-03:00";
  const [diagnostic, decision] = await runBoth(rows);
  assert.equal(
    diagnostic.stdout.trim(),
    "COMUN_PILOT_HUMAN_READINESS_CONFIRMED",
  );
  assert.equal(
    decision.stdout.trim(),
    "NO_GO_REMOTE_REVIEW\nNO_AUTOMATIC_PROMOTION",
  );
});

test("go/no-go local preserva o bloqueio de ambientes remotos", () => {
  for (const key of ["VERCEL", "SUPABASE_PROJECT_ID", "R2_ENDPOINT"]) {
    const run = spawnSync(
      process.execPath,
      [path.join(root, "scripts/comun-pilot-go-no-go-local.mjs")],
      {
        env: { ...process.env, [key]: "synthetic-remote" },
        encoding: "utf8",
        timeout: 5000,
      },
    );
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Ambiente remoto bloqueado/);
    assert.equal(run.stdout, "");
  }
});
