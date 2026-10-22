/** Owned, disposable Auth/PostgREST laboratory. No external URL or env-file input.
 * Run: node --conditions=react-server --experimental-strip-types
 * scripts/organization/rehearse-organizational-cycle.mjs --run-disposable --output <directory>
 * Requires cached Docker images; never pulls, migrates a product DB or enables flags.
 */
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

assert(
  process.argv.includes("--run-disposable"),
  "Explicit disposable invocation required",
);
const output = process.argv[process.argv.indexOf("--output") + 1];
assert(
  process.argv.includes("--output") && output,
  "Evidence directory required",
);
const root = fileURLToPath(new URL("../../", import.meta.url));
const git = (args) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const source = {
  sha: git(["rev-parse", "HEAD"]),
  tree: git(["rev-parse", "HEAD^{tree}"]),
  dirty: Boolean(git(["status", "--porcelain"])),
};
const sourceFiles = [
  "lib/collective-action-task-release.ts",
  "lib/community-mesa-contract.ts",
  "scripts/organization/disposable-cycle-fixture.sql",
  "scripts/organization/disposable-cycle-domain.mjs",
  "scripts/organization/rehearse-organizational-cycle.mjs",
  "supabase/migrations/20260726133409_comun_collective_actions_foundation.sql",
  "supabase/migrations/20260726161426_comun_collective_action_member_journey.sql",
];
const hashes = async () =>
  Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (name) => [
        name,
        createHash("sha256")
          .update(await fs.readFile(path.join(root, name)))
          .digest("hex"),
      ]),
    ),
  );
const sourceHashes = await hashes();
const owner = `comun-m6-${randomUUID()}`;
const resources = [];
const results = [];
const imageIds = {};
const password = randomBytes(24).toString("hex");
const secret = randomBytes(48).toString("hex");
const images = {
  pg: "postgres:17",
  auth: "public.ecr.aws/supabase/gotrue:v2.196.0",
  rest: "public.ecr.aws/supabase/postgrest:v16.2",
  node: "node:22.19.0-bookworm-slim",
};
if (process.argv.includes("--with-next-http"))
  images.node = `comun-m6-proof:${source.sha.slice(0, 12)}`;
const docker = (args, input) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      "docker",
      args,
      { maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // Never include command arguments, environment, SQL values or tokens in errors.
        if (error)
          reject(
            new Error(
              `Docker ${args[0]} failed (${error.code}): ${stderr
                .replaceAll(password, "[redacted]")
                .replaceAll(secret, "[redacted]")
                .replace(/eyJ[A-Za-z0-9_.-]+/g, "[jwt redacted]")
                .slice(-4000)}`,
            ),
          );
        else resolve((args[0] === "logs" ? stdout + stderr : stdout).trim());
      },
    );
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
const wait = async (check) => {
  for (let n = 0; n < 60; n++) {
    try {
      if (await check()) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Owned service readiness timeout");
};
const sql = (input) =>
  docker(
    [
      "exec",
      "-i",
      `${owner}-pg`,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      `rest_password=${password}`,
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
    ],
    input,
  );
let failure;
const cleanup = [];
try {
  for (const image of Object.values(images))
    imageIds[image] = JSON.parse(
      await docker(["image", "inspect", image]),
    )[0].Id;
  if (process.argv.includes("--with-next-http")) {
    assert(!source.dirty, "HTTP proof requires a clean candidate");
    const image = JSON.parse(
      await docker(["image", "inspect", images.node]),
    )[0];
    assert.equal(image.Config.Labels["comun.source.sha"], source.sha);
  }
  await docker([
    "network",
    "create",
    "--internal",
    "--label",
    `comun.owner=${owner}`,
    owner,
  ]);
  resources.push({ type: "network", id: owner });
  const run = async (suffix, image, env, port) => {
    const name = `${owner}-${suffix}`;
    const args = [
      "run",
      "-d",
      "--pull=never",
      "--label",
      `comun.owner=${owner}`,
      "--name",
      name,
      "--network",
      owner,
    ];
    if (port) args.push("-p", `127.0.0.1::${port}`);
    for (const [key, value] of Object.entries(env))
      args.push("-e", `${key}=${value}`);
    args.push(image);
    const id = await docker(args);
    resources.push({ type: "container", id });
    if (!port) return null;
    const inspection = JSON.parse(await docker(["inspect", id]))[0];
    const mapping = inspection.NetworkSettings.Ports?.[`${port}/tcp`]?.[0];
    assert(
      mapping?.HostIp === "127.0.0.1",
      `Loopback publication missing for ${suffix}; state=${inspection.State.Status}`,
    );
    return Number(mapping.HostPort);
  };
  await run("pg", images.pg, { POSTGRES_PASSWORD: password }, null);
  await wait(async () =>
    (
      await docker([
        "exec",
        `${owner}-pg`,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
      ])
    ).includes("accepting"),
  );
  await sql(
    await fs.readFile(
      new URL("disposable-cycle-fixture.sql", import.meta.url),
      "utf8",
    ),
  );
  const foundation = await fs.readFile(
    path.join(
      root,
      "supabase/migrations/20260726133409_comun_collective_actions_foundation.sql",
    ),
    "utf8",
  );
  const journey = await fs.readFile(
    path.join(
      root,
      "supabase/migrations/20260726161426_comun_collective_action_member_journey.sql",
    ),
    "utf8",
  );
  const tables = new Set([
    "comun_collective_actions",
    "comun_collective_action_tasks",
    "comun_collective_action_participations",
    "comun_collective_action_task_assignments",
  ]);
  const policies = [...foundation.matchAll(/create policy [\s\S]*?;/g)]
    .map((x) => x[0])
    .filter((s) => tables.has(s.match(/on public\.(\w+)/)?.[1]));
  assert.equal(policies.length, 8);
  await sql(policies.join("\n") + "\n" + journey);
  const capacity = foundation.slice(
    foundation.indexOf(
      "create function public.comun_collective_action_task_capacity_guard()",
    ),
    foundation.indexOf(
      "alter table public.comun_collective_actions enable row level security;",
    ),
  );
  assert(capacity.startsWith("create function"));
  await sql(capacity);
  // GoTrue resolves its own tables without a schema prefix. Test-local role only.
  await sql("alter role postgres set search_path = auth, public;");
  await run(
    "rest",
    images.rest,
    {
      PGRST_DB_URI: `postgres://authenticator:${password}@${owner}-pg:5432/postgres`,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: secret,
    },
    null,
  );
  await run(
    "auth",
    images.auth,
    {
      GOTRUE_API_HOST: "0.0.0.0",
      GOTRUE_API_PORT: "9999",
      GOTRUE_DB_DRIVER: "postgres",
      GOTRUE_DB_DATABASE_URL: `postgres://postgres:${password}@${owner}-pg:5432/postgres?sslmode=disable`,
      GOTRUE_DB_NAMESPACE: "auth",
      GOTRUE_SITE_URL: "http://127.0.0.1:54329",
      API_EXTERNAL_URL: "http://127.0.0.1:54329/auth/v1",
      GOTRUE_JWT_SECRET: secret,
      GOTRUE_JWT_ADMIN_ROLES: "service_role",
      GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
      GOTRUE_DISABLE_SIGNUP: "true",
      GOTRUE_SMTP_HOST: "127.0.0.1",
    },
    null,
  );
  const runner = await docker([
    "run",
    "-d",
    "--pull=never",
    "--label",
    `comun.owner=${owner}`,
    "--network",
    owner,
    ...(process.argv.includes("--with-next-http")
      ? []
      : ["--mount", `type=bind,source=${root},target=/work,readonly`]),
    "--workdir",
    "/work",
    images.node,
    "sleep",
    "infinity",
  ]);
  resources.push({ type: "container", id: runner });
  const reply = await docker([
    "exec",
    "-e",
    `COMUN_M6_OWNER=${owner}`,
    "-e",
    `COMUN_M6_PASSWORD=${password}`,
    "-e",
    `COMUN_M6_JWT=${secret}`,
    "-e",
    `COMUN_M6_AUTH_HOST=${owner}-auth`,
    "-e",
    `COMUN_M6_REST_HOST=${owner}-rest`,
    "-e",
    `COMUN_M6_NEXT_HTTP=${process.argv.includes("--with-next-http") ? "1" : "0"}`,
    runner,
    "node",
    "--conditions=react-server",
    "--experimental-strip-types",
    "scripts/organization/disposable-cycle-domain.mjs",
  ]);
  const resultLine = reply
    .split("\n")
    .find((line) => line.startsWith("M6_RESULT_JSON="));
  assert(resultLine, "Owned runner did not provide evidence");
  results.push(
    ...JSON.parse(resultLine.slice("M6_RESULT_JSON=".length)).results,
  );
  console.log(JSON.stringify(results));
} catch (error) {
  failure = error.message;
  try {
    const logs = await docker(["logs", `${owner}-auth`]);
    const errors = logs.split("\n").flatMap((line) => {
      try {
        const item = JSON.parse(line);
        return item.error ? [{ error: item.error, message: item.msg }] : [];
      } catch {
        return [];
      }
    });
    const safe = JSON.stringify(errors)
      .replaceAll(password, "[redacted]")
      .replaceAll(secret, "[redacted]")
      .replace(/eyJ[A-Za-z0-9_.-]+/g, "[jwt redacted]");
    failure += `; Auth diagnostics: ${safe.slice(-1800)}`;
  } catch {}
} finally {
  for (const resource of resources.reverse()) {
    try {
      const inspect = JSON.parse(
        await docker(
          resource.type === "container"
            ? ["inspect", resource.id]
            : ["network", "inspect", resource.id],
        ),
      )[0];
      assert.equal(
        (inspect.Config?.Labels ?? inspect.Labels)["comun.owner"],
        owner,
      );
      await docker(
        resource.type === "container"
          ? ["rm", "-f", "-v", resource.id]
          : ["network", "rm", resource.id],
      );
      const remaining = await docker(
        resource.type === "container"
          ? ["ps", "-aq", "--filter", `id=${resource.id}`]
          : ["network", "ls", "-q", "--filter", `name=^${owner}$`],
      );
      assert.equal(remaining, "");
      for (const mount of inspect.Mounts ?? []) {
        if (mount.Type !== "volume") continue;
        assert.equal(
          await docker([
            "volume",
            "ls",
            "-q",
            "--filter",
            `name=^${mount.Name}$`,
          ]),
          "",
        );
        cleanup.push({
          type: "owned anonymous volume",
          removed: true,
          absent: true,
        });
      }
      cleanup.push({ type: resource.type, removed: true, absent: true });
    } catch {
      cleanup.push({ type: resource.type, removed: false });
      failure ??= "Owned resource cleanup failed";
    }
  }
  await fs.mkdir(output, { recursive: true });
  if (JSON.stringify(await hashes()) !== JSON.stringify(sourceHashes))
    failure ??= "Source changed during proof";
  const fixture = await fs.readFile(
    new URL("disposable-cycle-fixture.sql", import.meta.url),
  );
  await fs.writeFile(
    path.join(output, "authenticated-cycle.json"),
    JSON.stringify(
      {
        utc: new Date().toISOString(),
        source,
        sourceHashes,
        owner,
        images,
        imageIds,
        result: failure
          ? "FAIL"
          : results.some((r) => r.result === "KNOWN_GAP")
            ? "PARTIAL"
            : "PASS",
        failure,
        proofKind: process.argv.includes("--with-next-http")
          ? "REAL_AUTH_DATABASE_AND_NEXT_HTTP; not full browser journey"
          : "REAL_AUTH_DATABASE_DOMAIN; not full Next/browser journey",
        fixture_sha256: createHash("sha256").update(fixture).digest("hex"),
        results,
        cleanup,
        limits: [
          "Minimal fixture, not whole migrated COMUN schema",
          "No publication flag enabled; route release gates unchanged",
          "Follow/request UI, browser history/offline and human experience not certified by this harness",
          "Membership/grant state setup is controlled test administration, not product self-service proof",
          "No shared or Production environment used",
        ],
      },
      null,
      2,
    ),
  );
}
if (failure) throw new Error(failure);
