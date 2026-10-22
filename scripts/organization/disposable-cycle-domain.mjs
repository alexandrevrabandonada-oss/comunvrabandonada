/** Real authenticated domain proof, invoked only inside the owned internal Docker network. */
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { resolveCommunitySelfServiceState } from "../../lib/community-administration.ts";
import { releaseOwnCollectiveTask } from "../../lib/collective-action-task-release.ts";
import {
  canReadMesaPilot,
  currentMesaRoles,
  ownPublicMesaTasks,
} from "../../lib/community-mesa-contract.ts";
assert(
  process.env.COMUN_M6_OWNER?.startsWith("comun-m6-"),
  "Owned runner required",
);
const owner = process.env.COMUN_M6_OWNER;
const password = process.env.COMUN_M6_PASSWORD;
const secret = process.env.COMUN_M6_JWT;
assert(password && secret);
const results = [];
let gateway;
let nextServer;
let nextErrors = "";
const token = (role) => {
  const enc = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const body = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ role, iss: "supabase", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
};
const wait = async (check) => {
  for (let n = 0; n < 60; n++) {
    try {
      if (await check()) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Owned service readiness timeout");
};
const check = async (name, run) => {
  await run();
  results.push({ name, result: "PASS" });
  console.log(`PASS ${name}`);
};
try {
  gateway = http.createServer(async (req, res) => {
    const isAuth = req.url.startsWith("/auth/v1/");
    const prefix = isAuth ? "/auth/v1" : "/rest/v1";
    if (!req.url.startsWith(prefix + "/")) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = [];
      for await (const part of req) body.push(part);
      const headers = { ...req.headers };
      delete headers.host;
      const response = await fetch(
        `http://${isAuth ? process.env.COMUN_M6_AUTH_HOST + ":9999" : process.env.COMUN_M6_REST_HOST + ":3000"}${req.url.slice(prefix.length)}`,
        {
          method: req.method,
          headers,
          body: body.length ? Buffer.concat(body) : undefined,
        },
      );
      const reply = Buffer.from(await response.arrayBuffer());
      const responseHeaders = Object.fromEntries(response.headers);
      delete responseHeaders["content-encoding"];
      delete responseHeaders["transfer-encoding"];
      responseHeaders["content-length"] = String(reply.length);
      res.writeHead(response.status, responseHeaders).end(reply);
    } catch {
      res.writeHead(503).end();
    }
  });
  await new Promise((r) => gateway.listen(54329, "127.0.0.1", r));
  const url = `http://127.0.0.1:${gateway.address().port}`;
  await wait(async () => (await fetch(`${url}/auth/v1/health`)).ok);
  const service = createClient(url, token("service_role"), {
    auth: { persistSession: false },
  });
  const accounts = [];
  for (const label of ["A", "B"]) {
    const email = `${label.toLowerCase()}-${owner}@example.invalid`;
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert(
      !created.error && created.data.user,
      `Synthetic Auth creation failed: ${created.error?.status}/${created.error?.code}/${created.error?.message}`,
    );
    const cookies = new Map();
    const client = createServerClient(url, token("anon"), {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (items) =>
          items.forEach(({ name, value }) => cookies.set(name, value)),
      },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    assert(!signed.error && signed.data.session, "Real Auth sign-in failed");
    const verified = await client.auth.getUser();
    assert.equal(verified.data.user?.id, created.data.user.id);
    accounts.push({ id: created.data.user.id, client, cookies });
  }
  const [a, b] = accounts;
  const ids = Object.fromEntries(
    ["community", "other", "membership", "role", "action", "task"].map(
      (key) => [key, randomUUID()],
    ),
  );
  const write = async (table, row) => {
    const result = await service.from(table).insert(row);
    assert(!result.error, `Fixture insert failed: ${table}`);
  };
  await write(
    "comun_member_profiles",
    accounts.map(({ id }) => ({
      user_id: id,
      display_name: "Pessoa sintética",
      status: "active",
    })),
  );
  const withHttp = process.env.COMUN_M6_NEXT_HTTP === "1";
  if (withHttp) {
    nextServer = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3126",
      ],
      {
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: token("anon"),
          SUPABASE_SERVICE_ROLE_KEY: token("service_role"),
        },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    nextServer.stderr.on("data", (data) => {
      nextErrors = (nextErrors + data.toString()).slice(-3000);
    });
    await wait(
      async () =>
        (
          await fetch("http://127.0.0.1:3126/api/comun/quality-status", {
            signal: AbortSignal.timeout(3000),
          })
        ).ok,
    );
  }
  const httpMesa = async (identity, slug, expected) => {
    if (!withHttp) return;
    const headers = identity
      ? {
          Cookie: [...identity.cookies]
            .map(([name, value]) => `${name}=${value}`)
            .join("; "),
        }
      : {};
    const response = await fetch(`http://127.0.0.1:3126/comun/c/${slug}/mesa`, {
      headers,
      redirect: "manual",
    });
    const body = await response.text();
    assert.equal(
      response.status,
      expected,
      `Next Mesa HTTP ${slug}: ${nextErrors
        .replaceAll(password, "[redacted]")
        .replaceAll(secret, "[redacted]")
        .replace(/eyJ[A-Za-z0-9_.-]+/g, "[jwt redacted]")
        .slice(-1500)}`,
    );
    if (expected === 200) {
      assert(body.includes('data-comun-mesa-private="true"'));
      assert.match(response.headers.get("cache-control"), /private/);
      assert.match(response.headers.get("cache-control"), /no-store/);
    } else assert(!body.includes('data-comun-mesa-private="true"'));
  };
  await write("comun_communities", [
    {
      id: ids.community,
      slug: "m6-owned",
      name: "Comunidade sintética descartável",
      short_description: "Ensaio técnico",
    },
    { id: ids.other, slug: "m6-other", name: "Outra comunidade sintética" },
  ]);
  await write("comun_collective_actions", {
    id: ids.action,
    community_id: ids.community,
    slug: "m6-action",
    title: "Ação sintética descartável",
    visibility: "public",
    status: "open",
    published_at: new Date().toISOString(),
  });
  await write("comun_collective_action_tasks", {
    id: ids.task,
    action_id: ids.action,
    title: "Responsabilidade sintética",
    state: "open",
  });
  const mesa = async (identity, communityId) => {
    // Real Auth, real DB + the production pure authorization contract. Not a Next HTTP proof.
    const verified = await identity.client.auth.getUser();
    assert(!verified.error);
    const membership = await service
      .from("comun_community_memberships")
      .select("id,state")
      .eq("community_id", communityId)
      .eq("member_user_id", verified.data.user.id)
      .maybeSingle();
    if (!membership.data) return false;
    const roles = await service
      .from("comun_community_role_assignments")
      .select("role,scope,starts_at,revoked_at")
      .eq("membership_id", membership.data.id);
    assert(!roles.error);
    return canReadMesaPilot({
      membershipState: membership.data.state,
      roles: currentMesaRoles(roles.data),
    });
  };
  await check(
    "real Auth A/B; no organizational access before grant",
    async () => {
      assert(!(await mesa(a, ids.community)));
      assert(!(await mesa(b, ids.community)));
    },
  );
  await write("comun_community_memberships", {
    id: ids.membership,
    community_id: ids.community,
    member_user_id: a.id,
    state: "following",
  });
  await check(
    "following and a join request never auto-approve membership",
    async () => {
      assert.equal(
        resolveCommunitySelfServiceState({
          priorState: "following",
          priorJoinedAt: null,
          intent: "join",
        }),
        "following",
      );
      assert(!(await mesa(a, ids.community)));
      await httpMesa(a, "m6-owned", 404);
    },
  );
  // Controlled grant in the owned fixture only, not a production enrollment action.
  assert(
    !(
      await service
        .from("comun_community_memberships")
        .update({ state: "member" })
        .eq("id", ids.membership)
    ).error,
  );
  await write("comun_community_role_assignments", {
    id: ids.role,
    membership_id: ids.membership,
    role: "facilitator",
    scope: "community",
    starts_at: new Date(Date.now() - 1000).toISOString(),
    revoked_at: null,
  });
  await check(
    "A authorized; B denied; different community denied",
    async () => {
      assert(await mesa(a, ids.community));
      assert(!(await mesa(b, ids.community)));
      assert(!(await mesa(a, ids.other)));
      await httpMesa(a, "m6-owned", 200);
      await httpMesa(b, "m6-owned", 404);
      await httpMesa(a, "m6-other", 404);
      await httpMesa(null, "m6-owned", 307);
    },
  );
  for (const person of [a, b])
    assert(
      !(
        await person.client
          .from("comun_collective_action_participations")
          .insert({
            action_id: ids.action,
            member_user_id: person.id,
            status: "participating",
          })
      ).error,
    );
  await check("A voluntarily claims a public canonical task", async () =>
    assert(
      !(
        await a.client
          .from("comun_collective_action_task_assignments")
          .insert({ task_id: ids.task, member_user_id: a.id, status: "active" })
      ).error,
    ),
  );
  await check(
    "RLS hides A responsibility from B and rejects impersonation",
    async () => {
      const own = await a.client
        .from("comun_collective_action_task_assignments")
        .select("id");
      assert(!own.error);
      assert.equal(own.data.length, 1);
      const foreign = await b.client
        .from("comun_collective_action_task_assignments")
        .select("id")
        .eq("member_user_id", a.id);
      assert(!foreign.error);
      assert.deepEqual(foreign.data, []);
      const mutation = await b.client
        .from("comun_collective_action_task_assignments")
        .update({ status: "released", released_at: new Date().toISOString() })
        .eq("member_user_id", a.id)
        .select("id");
      assert(!mutation.error);
      assert.deepEqual(mutation.data, []);
      assert(
        (
          await b.client
            .from("comun_collective_action_task_assignments")
            .insert({
              task_id: ids.task,
              member_user_id: a.id,
              status: "active",
            })
        ).error,
      );
    },
  );
  await check(
    "community member without organizational role remains denied",
    async () => {
      await write("comun_community_memberships", {
        id: randomUUID(),
        community_id: ids.community,
        member_user_id: b.id,
        state: "member",
      });
      assert(!(await mesa(b, ids.community)));
      await httpMesa(b, "m6-owned", 404);
    },
  );
  await check(
    "real own rows project only A public responsibility; no private fields",
    async () => {
      const rows = await service
        .from("comun_collective_action_task_assignments")
        .select(
          "id,member_user_id,status,task:comun_collective_action_tasks!inner(title,description,due_at,state,action:comun_collective_actions!inner(community_id,slug,title,visibility,status,published_at))",
        )
        .eq("member_user_id", a.id);
      assert(!rows.error);
      const projected = ownPublicMesaTasks(rows.data, a.id, ids.community);
      assert.equal(projected.length, 1);
      assert.deepEqual(ownPublicMesaTasks(rows.data, b.id, ids.community), []);
      assert(!JSON.stringify(projected).includes("member_user_id"));
    },
  );
  await check("withdrawal is blocked until active task is returned", async () =>
    assert(
      (
        await a.client
          .from("comun_collective_action_participations")
          .update({ status: "withdrew" })
          .eq("member_user_id", a.id)
      ).error?.message.includes("RELEASE_TASKS_BEFORE_LEAVING"),
    ),
  );
  await check(
    "revoked role removes access with an already issued JWT",
    async () => {
      assert(
        !(
          await service
            .from("comun_community_role_assignments")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", ids.role)
        ).error,
      );
      assert(!(await mesa(a, ids.community)));
      await httpMesa(a, "m6-owned", 404);
      assert(
        !(
          await service
            .from("comun_community_role_assignments")
            .update({ revoked_at: null })
            .eq("id", ids.role)
        ).error,
      );
    },
  );
  await check(
    "future role denies access; suspended profile redirects HTTP",
    async () => {
      assert(
        !(
          await service
            .from("comun_community_role_assignments")
            .update({
              starts_at: new Date(Date.now() + 86400000).toISOString(),
            })
            .eq("id", ids.role)
        ).error,
      );
      assert(!(await mesa(a, ids.community)));
      await httpMesa(a, "m6-owned", 404);
      assert(
        !(
          await service
            .from("comun_community_role_assignments")
            .update({ starts_at: new Date(Date.now() - 1000).toISOString() })
            .eq("id", ids.role)
        ).error,
      );
      assert(
        !(
          await service
            .from("comun_member_profiles")
            .update({ status: "suspended" })
            .eq("user_id", a.id)
        ).error,
      );
      await httpMesa(a, "m6-owned", 307);
      assert(
        !(
          await service
            .from("comun_member_profiles")
            .update({ status: "active" })
            .eq("user_id", a.id)
        ).error,
      );
    },
  );
  for (const state of ["paused", "left"])
    await check(
      `${state}: access denied, responsibility retained until voluntary return`,
      async () => {
        assert(
          !(
            await service
              .from("comun_community_memberships")
              .update({ state })
              .eq("id", ids.membership)
          ).error,
        );
        assert(!(await mesa(a, ids.community)));
        await httpMesa(a, "m6-owned", 404);
        const task = await a.client
          .from("comun_collective_action_task_assignments")
          .select("status");
        assert.equal(task.data?.[0]?.status, "active");
      },
    );
  assert(
    !(
      await service
        .from("comun_collective_actions")
        .update({ status: "archived", visibility: "internal" })
        .eq("id", ids.action)
    ).error,
  );
  await check(
    "closed internal action: verified owner can return; no replacement/history deletion",
    async () => {
      const verified = await a.client.auth.getUser();
      assert.equal(verified.data.user?.id, a.id);
      await releaseOwnCollectiveTask(service, {
        userId: verified.data.user.id,
        slug: "m6-action",
        taskId: ids.task,
      });
      const history = await a.client
        .from("comun_collective_action_task_assignments")
        .select("member_user_id,status,released_at");
      assert(!history.error);
      assert.equal(history.data.length, 1);
      assert.equal(history.data[0].member_user_id, a.id);
      assert.equal(history.data[0].status, "released");
      assert(history.data[0].released_at);
      assert(!(await mesa(a, ids.community)));
    },
  );
  await check(
    "wrong user, known URL/task and duplicate return never report success",
    async () => {
      await assert.rejects(
        releaseOwnCollectiveTask(service, {
          userId: b.id,
          slug: "m6-action",
          taskId: ids.task,
        }),
      );
      await assert.rejects(
        releaseOwnCollectiveTask(service, {
          userId: a.id,
          slug: "wrong",
          taskId: ids.task,
        }),
      );
      await assert.rejects(
        releaseOwnCollectiveTask(service, {
          userId: a.id,
          slug: "m6-action",
          taskId: ids.task,
        }),
      );
    },
  );
  await check(
    "stale resume after departure remains following and cannot restore Mesa",
    async () => {
      const state = resolveCommunitySelfServiceState({
        priorState: "left",
        priorJoinedAt: "2026-07-01T00:00:00Z",
        intent: "resume",
      });
      assert.equal(state, "following");
      assert(
        !(
          await service
            .from("comun_community_memberships")
            .update({ state })
            .eq("id", ids.membership)
        ).error,
      );
      assert(!(await mesa(a, ids.community)));
      await httpMesa(a, "m6-owned", 404);
    },
  );
  // Record the current policy gap; never silently turn it into a green safety gate.
  const reactivation = await a.client
    .from("comun_collective_action_task_assignments")
    .update({ status: "active", released_at: null })
    .eq("member_user_id", a.id)
    .select("id");
  if (!reactivation.error && reactivation.data?.length) {
    results.push({
      name: "RLS permits direct reactivation of own assignment after closed action",
      result: "KNOWN_GAP",
      next: "Reviewed forward-only database authorization change required; not applied by M6",
    });
    const verified = await a.client.auth.getUser();
    await releaseOwnCollectiveTask(service, {
      userId: verified.data.user.id,
      slug: "m6-action",
      taskId: ids.task,
    });
  } else
    results.push({
      name: "RLS denies reactivation after closed action",
      result: "PASS",
    });
  if (withHttp)
    results.push({
      name: "real Next HTTP: SSR cookies, A allowed; B/other/revoked/future/paused/left denied; suspended/anonymous redirected; private no-store",
      result: "PASS",
    });
  for (const identity of accounts)
    assert(!(await service.auth.admin.deleteUser(identity.id)).error);
  const users = await service.auth.admin.listUsers();
  assert(!users.error);
  assert.equal(users.data.users.length, 0);
  results.push({ name: "synthetic Auth accounts removed", result: "PASS" });
  console.log("M6_RESULT_JSON=" + JSON.stringify({ results }));
} finally {
  if (nextServer && nextServer.exitCode === null) {
    const exited = new Promise((r) => nextServer.once("exit", r));
    nextServer.kill("SIGTERM");
    const kill = setTimeout(() => nextServer.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(kill);
  }
  if (gateway) await new Promise((r) => gateway.close(r));
}
