/** Real Auth + auxiliary PostgREST against the hosted CI's complete reset.
 * No product API configuration is changed. Only synthetic fixtures are written.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import http from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { rehearseNucleusCandidate } from "./nucleus-disposable-domain.mjs";

export function removeOwnedAuxiliary(docker, owner) {
  assert.match(owner, /^comun-m7d-[a-f0-9-]{36}$/);
  const list = () =>
    docker(["ps", "-a", "--filter", `name=^/${owner}$`, "--format", "{{.ID}}"]);
  if (!list()) return true;
  const actual = JSON.parse(docker(["inspect", owner]))[0];
  assert.equal(actual.Config.Labels["comun.owner"], owner);
  docker(["rm", "-f", "-v", owner]);
  return list() === "";
}

export async function rehearseFullSchemaAuth({ admin, local }) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  const api = new URL(local.API_URL);
  assert.equal(api.protocol, "http:");
  assert(["127.0.0.1", "localhost"].includes(api.hostname));
  assert.equal(api.port, "55431");
  assert.equal(api.pathname, "/");
  assert.equal(api.username + api.password, "");
  assert.equal(api.search + api.hash, "");
  const owner = "comun-m7d-" + randomUUID();
  const password = randomBytes(24).toString("hex");
  const accounts = [],
    results = [];
  const context = { mode: "FULL_RESET_CI", admin };
  const proof = {
    proofKind:
      "FULL_RESET_REAL_AUTH_POSTGREST_RLS_M7_NOT_NEXT_UI_OR_HUMAN_ACCEPTANCE",
    result: "FAIL",
    stage: "inspect-owned-services",
    results,
    cleanup: {
      schemaAbsent: false,
      profilesAbsent: false,
      accountsAbsent: false,
      communitiesAbsent: false,
      gatewayClosed: false,
      auxiliaryAbsent: false,
    },
  };
  const docker = (args) =>
    execFileSync("docker", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    }).trim();
  const inspect = (name) => JSON.parse(docker(["inspect", name]))[0];
  const original = inspect("supabase_rest_COMUM_VR_ABANDONADA");
  proof.postgrestImageId = original.Image;
  assert.equal(
    original.Config.Labels["com.supabase.cli.project"],
    "COMUM_VR_ABANDONADA",
  );
  const database = inspect("supabase_db_COMUM_VR_ABANDONADA");
  assert.equal(
    database.Config.Labels["com.supabase.cli.project"],
    "COMUM_VR_ABANDONADA",
  );
  const network = Object.keys(original.NetworkSettings.Networks).find(
    (name) => name in database.NetworkSettings.Networks,
  );
  assert(network);
  const restEnv = Object.fromEntries(
    original.Config.Env.map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
  );
  const uri = new URL(restEnv.PGRST_DB_URI);
  assert.equal(uri.username, "authenticator");
  assert.equal(uri.pathname, "/postgres");
  assert.equal(uri.search + uri.hash, "");
  uri.hostname = "supabase_db_COMUM_VR_ABANDONADA";
  uri.port = "5432";
  assert(restEnv.PGRST_JWT_SECRET && local.ANON_KEY && local.SERVICE_ROLE_KEY);
  let gateway, service;
  try {
    proof.stage = "auxiliary-postgrest";
    docker([
      "run",
      "-d",
      "--name",
      owner,
      "--label",
      "comun.owner=" + owner,
      "--network",
      network,
      "-p",
      "127.0.0.1::3000",
      "-e",
      "PGRST_DB_URI=" + uri.href,
      "-e",
      "PGRST_DB_SCHEMAS=public,comun_org_private",
      "-e",
      "PGRST_DB_ANON_ROLE=anon",
      "-e",
      "PGRST_JWT_SECRET=" + restEnv.PGRST_JWT_SECRET,
      original.Image,
    ]);
    const binding = inspect(owner).NetworkSettings.Ports["3000/tcp"][0];
    assert.equal(binding.HostIp, "127.0.0.1");
    const rest = `http://127.0.0.1:${binding.HostPort}`;
    let ready = false;
    for (let n = 0; n < 60; n++) {
      try {
        if ((await fetch(rest)).status < 500) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert(ready, "Owned PostgREST unavailable");
    gateway = http.createServer(async (req, res) => {
      const auth = req.url.startsWith("/auth/v1/");
      if (!auth && !req.url.startsWith("/rest/v1/")) {
        res.writeHead(404).end();
        return;
      }
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const headers = { ...req.headers };
        delete headers.host;
        const target = auth
          ? api.origin + req.url
          : rest + req.url.slice("/rest/v1".length);
        const response = await fetch(target, {
          method: req.method,
          headers,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        });
        const body = Buffer.from(await response.arrayBuffer());
        const reply = Object.fromEntries(response.headers);
        delete reply["content-encoding"];
        delete reply["transfer-encoding"];
        reply["content-length"] = String(body.length);
        res.writeHead(response.status, reply).end(body);
      } catch {
        res.writeHead(503).end();
      }
    });
    await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${gateway.address().port}`;
    context.gatewayUrl = url;
    service = createClient(url, local.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    proof.stage = "synthetic-auth-identities";
    for (const label of ["a", "b", "c"]) {
      const email = `${label}-${owner}@example.invalid`;
      const createdUser = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert(
        !createdUser.error && createdUser.data.user,
        "Synthetic account creation failed",
      );
      const account = { id: createdUser.data.user.id };
      accounts.push(account);
      const client = createClient(url, local.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signed = await client.auth.signInWithPassword({ email, password });
      assert(!signed.error && signed.data.session);
      assert.equal((await client.auth.getUser()).data.user?.id, account.id);
      account.client = client;
      await admin.query(
        "insert into public.comun_member_profiles(user_id,display_name,status) values($1,'Pessoa sintética','active') on conflict(user_id) do update set display_name=excluded.display_name,status='active'",
        [account.id],
      );
    }
    proof.stage = "m7-http-rls-matrix";
    await rehearseNucleusCandidate({
      accounts,
      service,
      owner,
      password,
      laboratory: context,
      check: async (name, run) => {
        proof.currentCase = name;
        try {
          await run();
        } catch (error) {
          proof.failedCase ??= name;
          throw error;
        }
        results.push({
          name,
          result: "PASS",
          scope: "M7_FULL_RESET_AUTH_HTTP_RLS",
        });
      },
    });
    assert.equal(results.length, 13);
    proof.result = "PASS";
    proof.stage = "complete";
  } catch (error) {
    proof.failureKind = error.code || error.name;
    proof.failureCatalog = {
      schema: error.schema,
      table: error.table,
      column: error.column,
      constraint: error.constraint,
    };
  } finally {
    const clean = async (key, run) => {
      try {
        proof.cleanup[key] = await run();
      } catch {
        proof.cleanup[key] = false;
      }
    };
    await clean("schemaAbsent", async () => {
      await admin.query("rollback");
      await admin.query("drop schema if exists comun_org_private cascade");
      return (
        await admin.query(
          "select to_regnamespace('comun_org_private') is null as absent",
        )
      ).rows[0].absent;
    });
    const communities = context.fixtureCommunities || [];
    await clean("communitiesAbsent", async () => {
      await admin.query(
        "delete from public.comun_communities where id=any($1::uuid[])",
        [communities],
      );
      return (
        (
          await admin.query(
            "select count(*)::int as n from public.comun_communities where id=any($1::uuid[])",
            [communities],
          )
        ).rows[0].n === 0
      );
    });
    const ids = accounts.map((account) => account.id);
    await clean("profilesAbsent", async () => {
      await admin.query(
        "delete from public.comun_member_profiles where user_id=any($1::uuid[])",
        [ids],
      );
      return (
        (
          await admin.query(
            "select count(*)::int as n from public.comun_member_profiles where user_id=any($1::uuid[])",
            [ids],
          )
        ).rows[0].n === 0
      );
    });
    await clean("accountsAbsent", async () => {
      const outcomes = await Promise.allSettled(
        accounts.map((account) => service.auth.admin.deleteUser(account.id)),
      );
      const removed = outcomes.every(
        (outcome) => outcome.status === "fulfilled" && !outcome.value.error,
      );
      return (
        removed &&
        (
          await admin.query(
            "select count(*)::int as n from auth.users where id=any($1::uuid[])",
            [ids],
          )
        ).rows[0].n === 0
      );
    });
    await clean("gatewayClosed", async () => {
      if (gateway) await new Promise((resolve) => gateway.close(resolve));
      return true;
    });
    // docker run may create a stopped container before returning an error.
    // Always reconcile its actual presence, even when startup did not succeed.
    await clean("auxiliaryAbsent", async () =>
      removeOwnedAuxiliary(docker, owner),
    );
    if (!Object.values(proof.cleanup).every(Boolean)) proof.result = "FAIL";
  }
  return proof;
}
