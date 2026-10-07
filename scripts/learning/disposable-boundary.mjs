import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

export function disposableContext(env) {
  assert.equal(
    env.COMUN_LEARNING_DISPOSABLE_AUTH,
    "true",
    "disposable confirmation required",
  );
  assert.match(env.COMUN_LEARNING_RUN_ID ?? "", /^\d+-\d+$/);
  for (const key of [
    "SUPABASE_DB_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
  ]) {
    assert.ok(!env[key], `remote credential forbidden: ${key}`);
  }
  const api = new URL(env.COMUN_LEARNING_LOCAL_API_URL);
  const db = new URL(env.COMUN_LEARNING_LOCAL_DATABASE_URL);
  assert.equal(api.origin, "http://127.0.0.1:55431");
  assert.equal(api.pathname, "/");
  assert.equal(api.username + api.password + api.search + api.hash, "");
  assert.equal(db.protocol, "postgresql:");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "55432");
  assert.equal(db.pathname, "/postgres");
  assert.equal(db.search + db.hash, "");
  assert.ok(
    env.COMUN_LEARNING_LOCAL_ANON_KEY && env.COMUN_LEARNING_LOCAL_SERVICE_KEY,
  );
  return {
    api: api.origin,
    database: db.href,
    project: `escola-proof-${env.COMUN_LEARNING_RUN_ID}`,
    anon: env.COMUN_LEARNING_LOCAL_ANON_KEY,
    service: env.COMUN_LEARNING_LOCAL_SERVICE_KEY,
  };
}

export function assertOwnedContainers(
  context,
  inspect = (name) =>
    JSON.parse(
      execFileSync("docker", ["inspect", name], {
        encoding: "utf8",
        timeout: 10000,
      }),
    )[0],
) {
  for (const [kind, containerPort, hostPort] of [
    ["db", "5432/tcp", "55432"],
    ["kong", "8000/tcp", "55431"],
  ]) {
    const name = `supabase_${kind}_${context.project}`;
    const container = inspect(name);
    assert.equal(container.Name, `/${name}`, "foreign container");
    assert.equal(container.State.Running, true, "container not running");
    const ports = container.NetworkSettings.Ports[containerPort];
    assert.ok(
      ports?.some((port) => port.HostPort === hostPort),
      "unexpected port mapping",
    );
    assert.match(
      container.Config.Image,
      /^public\.ecr\.aws\/supabase\//,
      "unexpected image lineage",
    );
  }
}
