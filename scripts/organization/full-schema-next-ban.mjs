/** Built Next/SSR + Chromium against owned full-reset services. No remote inputs. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
const { encodeReply } = createRequire(import.meta.url)(
  "next/dist/compiled/react-server-dom-webpack/client.node",
);

export async function rehearseNextBan({
  admin,
  service,
  local,
  laboratory,
  accounts,
  password,
  owner,
  check,
}) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  const base = laboratory.gatewayUrl;
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const origin = "http://127.0.0.1:3127";
  const id = randomUUID(),
    membership = randomUUID(),
    role = randomUUID();
  const slug = "security-" + id;
  const sentinel = "PRIVATE-" + randomUUID();
  const cookies = new Map();
  const client = createServerClient(base, local.ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) =>
        items.forEach(({ name, value }) => cookies.set(name, value)),
    },
    auth: { autoRefreshToken: false },
  });
  let server, browser, identity, actionId;
  const diagnostic = (laboratory.nextDiagnostics = {});
  const cookieHeader = () =>
    [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  const paths = [
    `/comun/c/${slug}/mesa`,
    "/comun/minha-participacao",
    `/comun/c/${slug}/participar`,
    "/comun/minha-participacao?experiencia=legacy",
  ];
  const request = (path, extra = {}) =>
    fetch(origin + path, {
      redirect: "manual",
      ...extra,
      headers: { Cookie: cookieHeader(), ...extra.headers },
    });
  const noPrivate = async (response) => {
    const body = await response.text();
    assert(
      !body.includes(sentinel),
      "Private sentinel in denied network response",
    );
    assert(
      !body.includes('data-comun-app-v2-page="my-area"') &&
        !body.includes('data-comun-app-v2-page=\\"my-area\\"'),
    );
    assert(
      !body.includes('data-comun-mesa-private=\\"true\\"') &&
        !body.includes('data-comun-mesa-private="true"'),
    );
    assert(
      response.status >= 300 ||
        response.headers.get("x-nextjs-redirect") ||
        response.headers.get("x-action-redirect") ||
        body.includes("NEXT_REDIRECT"),
      "Expected explicit denial/redirect, not a successful private response",
    );
  };
  try {
    const email = `ssr-${owner}@example.invalid`;
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert(!created.error && created.data.user);
    identity = { id: created.data.user.id };
    accounts.push(identity); // Outer runner owns Auth/profile cleanup even on failure here.
    assert(!(await client.auth.signInWithPassword({ email, password })).error);
    assert.equal((await client.auth.getUser()).data.user?.id, identity.id);
    await admin.query(
      "insert into public.comun_member_profiles(user_id,display_name,status) values($1,$2,'active')",
      [identity.id, sentinel],
    );
    await admin.query(
      "insert into public.comun_communities(id,slug,name,short_description,full_description,main_cta) values($1,$2,'Comunidade descartável','Ensaio SSR','Somente laboratório de segurança','Conhecer')",
      [id, slug],
    );
    await admin.query(
      "insert into public.comun_community_memberships(id,community_id,member_user_id,state) values($1,$2,$3,'member')",
      [membership, id, identity.id],
    );
    await admin.query(
      "insert into public.comun_community_role_assignments(id,membership_id,role,scope) values($1,$2,'coordinator','community')",
      [role, membership],
    );
    const runtimeEnv = {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: base,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    };
    diagnostic.stage = "owned-production-build";
    const build = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "build"],
      { env: runtimeEnv, stdio: ["ignore", "ignore", "ignore"] },
    );
    diagnostic.buildExit = await new Promise((resolve, reject) => {
      build.once("error", reject);
      build.once("exit", resolve);
    });
    assert.equal(diagnostic.buildExit, 0, "Owned production build must pass");
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3127",
      ],
      {
        env: runtimeEnv,
        stdio: ["ignore", "ignore", "ignore"], // Never collect private HTML/tokens or development error payloads.
      },
    );
    let ready = false;
    for (let n = 0; n < 60; n++) {
      try {
        if (
          (
            await fetch(origin + "/api/comun/quality-status", {
              signal: AbortSignal.timeout(3000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert(ready, "Owned Next unavailable");
    const before = (await client.auth.getSession()).data.session;
    assert(before?.access_token && before.refresh_token);
    let contexts, page;
    await check(
      "Next full reset: live cookies authorize Mesa, own area and real server action",
      async () => {
        const mesa = await request(paths[0]);
        diagnostic.stage = "authorized-mesa";
        diagnostic.mesaStatus = mesa.status;
        diagnostic.mesaCacheControl = mesa.headers.get("cache-control");
        assert.equal(mesa.status, 200);
        assert.match(mesa.headers.get("cache-control"), /private/);
        assert.match(mesa.headers.get("cache-control"), /no-store/);
        assert((await mesa.text()).includes('data-comun-mesa-private="true"'));
        const canonicalArea = await request(paths[1]);
        assert.equal(canonicalArea.status, 200);
        assert(
          (await canonicalArea.text()).includes(
            'data-comun-app-v2-page="my-area"',
          ),
        );
        // App V2 deliberately omits the display name; retain the sentry assertion
        // on the existing legacy surface where that private field is rendered.
        const area = await request(paths[3]);
        diagnostic.stage = "authorized-own-area";
        diagnostic.areaStatus = area.status;
        assert.equal(area.status, 200);
        assert((await area.text()).includes(sentinel));
        await request(paths[2]); // Compile canonical action even when synthetic slug has no editorial experience.
        const manifest = JSON.parse(
          await fs.readFile(
            ".next/server/server-reference-manifest.json",
            "utf8",
          ),
        );
        actionId = Object.entries(manifest.node).find(
          ([, value]) => value.exportedName === "changeCommunityMembership",
        )?.[0];
        diagnostic.stage = "canonical-action-manifest";
        diagnostic.actionFound = Boolean(actionId);
        assert(actionId, "Canonical server action must be compiled");
        const body = new FormData();
        body.set("slug", slug);
        body.set("intent", "save");
        body.set("collaboration", "art");
        const submit = await request(paths[2], {
          method: "POST",
          headers: { "Next-Action": actionId, Origin: origin },
          body: await encodeReply([body]),
        });
        await submit.text();
        diagnostic.stage = "authorized-action-readback";
        diagnostic.actionStatus = submit.status;
        assert(submit.status < 400, "Authorized canonical action failed");
        assert.deepEqual(
          (
            await admin.query(
              "select collaboration_preferences from public.comun_community_memberships where id=$1",
              [membership],
            )
          ).rows[0].collaboration_preferences,
          ["art"],
        );
        browser = await chromium.launch({
          headless: true,
          channel: "chromium",
          ignoreDefaultArgs: ["--disable-back-forward-cache"],
        });
        diagnostic.stage = "authorized-browser";
        contexts = await Promise.all(
          [0, 1].map(async () => {
            const context = await browser.newContext({
              viewport: { width: 390, height: 844 },
            });
            await context.addCookies(
              [...cookies].map(([name, value]) => ({
                name,
                value,
                url: origin,
                sameSite: "Lax",
              })),
            );
            return context;
          }),
        );
        page = await contexts[0].newPage();
        await page.goto(origin + paths[0]);
        await page.locator('[data-comun-mesa-private="true"]').waitFor();
        await page.goto(origin + "/comun/offline");
        await page.evaluate(async () => {
          await navigator.serviceWorker.register("/sw.js");
          await navigator.serviceWorker.ready;
        });
      },
    );
    await check(
      "Next full reset: Auth outage fails closed for HTML and RSC",
      async () => {
        laboratory.authUnavailable = true;
        try {
          for (const path of paths) {
            await noPrivate(await request(path));
            await noPrivate(
              await request(path, {
                headers: { RSC: "1", "Next-Router-Prefetch": "1" },
              }),
            );
          }
        } finally {
          laboratory.authUnavailable = false;
        }
      },
    );
    await check(
      "Next full reset: ban during privileged profile read denies in-flight response",
      async () => {
        let reached, release;
        const waiting = new Promise((resolve) => {
          reached = resolve;
        });
        const held = new Promise((resolve) => {
          release = resolve;
        });
        laboratory.holdProfile = { userId: identity.id, reached, held };
        const inflight = request(paths[0]);
        try {
          await Promise.race([
            waiting,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("PROFILE_HOLD_NOT_REACHED")),
                15000,
              ),
            ),
          ]);
          const banned = await service.auth.admin.updateUserById(identity.id, {
            ban_duration: "1h",
          });
          assert(!banned.error && banned.data.user?.banned_until);
        } finally {
          laboratory.holdProfile = null;
          release();
        }
        await noPrivate(await inflight);
        const state = await admin.query(
          "select p.status,r.revoked_at from public.comun_member_profiles p join public.comun_community_role_assignments r on r.id=$2 where p.user_id=$1",
          [identity.id, role],
        );
        assert.equal(state.rows[0].status, "active");
        assert.equal(state.rows[0].revoked_at, null);
      },
    );
    await check(
      "Next full reset: old cookies, RSC prefetch and repeated concurrent reads reveal no private data",
      async () => {
        for (let n = 0; n < 2; n++)
          await Promise.all(
            paths.flatMap((path) => [
              request(path).then(noPrivate),
              request(path, {
                headers: { RSC: "1", "Next-Router-Prefetch": "1" },
              }).then(noPrivate),
            ]),
          );
      },
    );
    await check(
      "Next full reset: banned server action cannot change membership",
      async () => {
        const form = new FormData();
        form.set("slug", slug);
        form.set("intent", "leave");
        // Use the installed React encoder, never infer Flight's multipart wire format.
        await noPrivate(
          await request(paths[2], {
            method: "POST",
            headers: { "Next-Action": actionId, Origin: origin },
            body: await encodeReply([form]),
          }),
        );
        assert.equal(
          (
            await admin.query(
              "select state from public.comun_community_memberships where id=$1",
              [membership],
            )
          ).rows[0].state,
          "member",
        );
      },
    );
    await check(
      "Next full reset: second browser, history and offline caches do not refetch private data",
      async () => {
        await page.goBack({ waitUntil: "domcontentloaded" });
        assert.equal(
          await page.locator('[data-comun-mesa-private="true"]').count(),
          0,
        );
        for (const context of contexts) {
          const other = await context.newPage();
          await other.goto(origin + paths[0]);
          assert.equal(
            await other.locator('[data-comun-mesa-private="true"]').count(),
            0,
          );
          assert(!(await other.content()).includes(sentinel));
          const leak = await other.evaluate(async () => {
            for (const name of await caches.keys())
              for (const key of await (await caches.open(name)).keys())
                if (
                  /\/mesa$|\/minha-participacao|\/participar$/.test(
                    new URL(key.url).pathname,
                  )
                )
                  return true;
            return false;
          });
          assert.equal(leak, false);
        }
        await page.goto(origin + "/comun/offline");
        await contexts[0].setOffline(true);
        try {
          await page.goto(origin + paths[0]);
        } catch {}
        assert.equal(
          await page.locator('[data-comun-mesa-private="true"]').count(),
          0,
        );
        await contexts[0].setOffline(false);
      },
    );
    await check(
      "Next full reset: refresh denied; revoked session stays denied even after synthetic unban",
      async () => {
        const refresh = await fetch(
          base + "/auth/v1/token?grant_type=refresh_token",
          {
            method: "POST",
            headers: {
              apikey: local.ANON_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: before.refresh_token }),
          },
        );
        assert(
          refresh.status >= 400,
          "Banned refresh token unexpectedly accepted",
        );
        const logout = await service.auth.admin.signOut(
          before.access_token,
          "global",
        );
        laboratory.authOutcomes = {
          refreshStatus: refresh.status,
          logoutStatus: logout.error?.status ?? 204,
        };
        // A banned identity may be denied even the logout endpoint. Explicitly revoke
        // only this synthetic account's remaining sessions, then prove absence.
        await admin.query("delete from auth.sessions where user_id=$1", [
          identity.id,
        ]);
        assert.equal(
          (
            await admin.query(
              "select count(*)::int as n from auth.sessions where user_id=$1",
              [identity.id],
            )
          ).rows[0].n,
          0,
        );
        laboratory.authOutcomes.sessionInvalidation =
          "OWNED_ADMIN_FIXTURE_CONFIRMED_ABSENT";
        await noPrivate(await request(paths[0]));
        await noPrivate(await request(paths[1]));
        const unbanned = await service.auth.admin.updateUserById(identity.id, {
          ban_duration: "none",
        });
        assert(!unbanned.error);
        // Isolate session revocation from the ban itself: active profile/role and
        // unbanned account must still not resurrect the explicitly deleted session.
        await noPrivate(await request(paths[0]));
        await noPrivate(await request(paths[1]));
      },
    );
  } finally {
    laboratory.authUnavailable = false;
    if (laboratory.holdProfile)
      throw new Error("OWNED_PROFILE_HOLD_UNRELEASED");
    if (browser) await browser.close();
    if (server && server.exitCode === null) {
      const stopped = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await stopped;
    }
    if (identity)
      await admin.query(
        "delete from public.comun_member_inbox where member_user_id=$1",
        [identity.id],
      );
    await admin.query("delete from public.comun_communities where id=$1", [id]);
    await check(
      "Next full reset: own community, role, membership and Next process cleaned",
      async () => {
        assert.equal(
          (
            await admin.query(
              "select count(*)::int as n from public.comun_communities where id=$1",
              [id],
            )
          ).rows[0].n,
          0,
        );
        if (identity)
          assert.equal(
            (
              await admin.query(
                "select count(*)::int as n from public.comun_member_inbox where member_user_id=$1",
                [identity.id],
              )
            ).rows[0].n,
            0,
          );
        assert.equal(
          (
            await admin.query(
              "select count(*)::int as n from public.comun_community_memberships where id=$1",
              [membership],
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (
            await admin.query(
              "select count(*)::int as n from public.comun_community_role_assignments where id=$1",
              [role],
            )
          ).rows[0].n,
          0,
        );
        assert(
          !server || server.exitCode !== null || server.signalCode !== null,
        );
      },
    );
  }
}
