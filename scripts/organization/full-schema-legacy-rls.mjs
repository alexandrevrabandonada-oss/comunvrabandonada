/** Measure legacy policy exposure, then test a separate unreleased restrictive proposal. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

export async function rehearseLegacyRls({
  admin,
  service,
  local,
  laboratory,
  accounts,
  owner,
  password,
  check,
  onCleanup,
}) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  assert.equal(new URL(laboratory.gatewayUrl).hostname, "127.0.0.1");
  const report = (laboratory.legacyRls = {
    baseline: [],
    proposal: "NOT_RUN",
    release: "BLOCKED_UNAPPLIED_PROPOSAL",
    cleanup: false,
  });
  const ids = Object.fromEntries(
    [
      "community",
      "membership",
      "role",
      "action",
      "participation",
      "task",
      "assignment",
      "extraAction",
      "extraTask",
      "extraParticipation",
      "extraAssignment",
    ].map((key) => [key, randomUUID()]),
  );
  const tables = [
    ["comun_community_memberships", ids.membership],
    ["comun_community_role_assignments", ids.role],
    ["comun_collective_action_participations", ids.participation],
    ["comun_collective_action_task_assignments", ids.assignment],
  ];
  const names = tables.map(([table]) => table);
  const policies = async () =>
    (
      await admin.query(
        "select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname",
        [names],
      )
    ).rows;
  const grants = async () =>
    (
      await admin.query(
        "select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name=any($1::text[]) order by table_name,grantee,privilege_type",
        [names],
      )
    ).rows;
  const originalPolicies = await policies(),
    originalGrants = await grants();
  assert(
    (
      await admin.query(
        "select to_regnamespace('comun_auth_private') is null as absent",
      )
    ).rows[0].absent,
  );
  let identity,
    ownsSchema = false,
    access;
  const email = `legacy-${owner}@example.invalid`;
  const client = createClient(laboratory.gatewayUrl, local.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = async () => {
    const result = await client.auth.signInWithPassword({ email, password });
    assert(!result.error && result.data.session);
    assert.equal((await client.auth.getUser()).data.user?.id, identity.id);
    access = result.data.session.access_token;
  };
  const probe = async (
    token,
    table,
    id,
    body,
    method = body ? "PATCH" : "GET",
  ) => {
    const response = await fetch(
      `${laboratory.gatewayUrl}/rest/v1/${table}?${method === "POST" ? "" : `id=eq.${id}&`}select=id`,
      {
        method,
        headers: {
          apikey: local.ANON_KEY,
          Authorization: "Bearer " + token,
          ...(body
            ? {
                "Content-Type": "application/json",
                Prefer: "return=representation",
              }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    assert(
      [200, 201, 401, 403].includes(response.status),
      "Unexpected legacy probe response (infra/quota are not denials)",
    );
    let count = 0;
    if ([200, 201].includes(response.status)) {
      const rows = await response.json();
      assert(Array.isArray(rows));
      assert(rows.length <= 1);
      count = rows.length;
    }
    return {
      table,
      operation: method === "POST" ? "INSERT" : body ? "UPDATE" : "SELECT",
      httpStatus: response.status,
      rows: count,
    };
  };
  const observe = async (token, state, baseline) => {
    const outcomes = [];
    for (const [table, id] of tables)
      outcomes.push(await probe(token, table, id));
    outcomes.push(
      await probe(token, tables[2][0], ids.participation, {
        contribution_note_private: "Owned synthetic probe",
      }),
    );
    outcomes.push(
      await probe(token, tables[3][0], ids.assignment, {
        status: "released",
        released_at: new Date().toISOString(),
      }),
    );
    outcomes.push(
      await probe(
        token,
        tables[2][0],
        ids.extraParticipation,
        {
          id: ids.extraParticipation,
          action_id: ids.extraAction,
          member_user_id: identity.id,
          status: "participating",
        },
        "POST",
      ),
    );
    outcomes.push(
      await probe(
        token,
        tables[3][0],
        ids.extraAssignment,
        {
          id: ids.extraAssignment,
          task_id: ids.extraTask,
          member_user_id: identity.id,
          status: "active",
        },
        "POST",
      ),
    );
    if (!baseline) {
      for (const [table, id] of [
        [tables[2][0], ids.extraParticipation],
        [tables[3][0], ids.extraAssignment],
      ])
        assert.equal(
          (
            await admin.query(
              `select count(*)::int as n from public.${table} where id=$1`,
              [id],
            )
          ).rows[0].n,
          0,
        );
    }
    await admin.query(
      "delete from public.comun_collective_action_task_assignments where id=$1",
      [ids.extraAssignment],
    );
    await admin.query(
      "delete from public.comun_collective_action_participations where id=$1",
      [ids.extraParticipation],
    );
    if (baseline)
      report.baseline.push(
        ...outcomes.map((row) => ({
          ...row,
          state,
          securityResult: row.rows ? "FAIL" : "PASS",
        })),
      );
    else
      assert(
        outcomes.every((row) => row.rows === 0),
        "Unreleased proposal still exposes legacy data/powers",
      );
    // Restore only this fixture after measuring a permitted legacy mutation.
    await admin.query(
      "update public.comun_collective_action_task_assignments set status='active',released_at=null where id=$1",
      [ids.assignment],
    );
    await admin.query(
      "update public.comun_collective_action_participations set contribution_note_private=null where id=$1",
      [ids.participation],
    );
    return outcomes;
  };
  const ban = async () => {
    const result = await service.auth.admin.updateUserById(identity.id, {
      ban_duration: "1h",
    });
    assert(!result.error && result.data.user?.banned_until);
    const user = await fetch(laboratory.gatewayUrl + "/auth/v1/user", {
      headers: { apikey: local.ANON_KEY, Authorization: "Bearer " + access },
    });
    assert([401, 403].includes(user.status));
  };
  const unban = async () => {
    assert(
      !(
        await service.auth.admin.updateUserById(identity.id, {
          ban_duration: "none",
        })
      ).error,
    );
    await login();
  };
  const logout = async () => {
    assert(!(await service.auth.admin.signOut(access, "global")).error);
    assert.equal(
      (
        await admin.query(
          "select count(*)::int as n from auth.sessions where user_id=$1",
          [identity.id],
        )
      ).rows[0].n,
      0,
    );
  };
  try {
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert(!created.error && created.data.user);
    identity = { id: created.data.user.id };
    accounts.push(identity);
    await admin.query(
      "insert into public.comun_member_profiles(user_id,display_name,status) values($1,'Ensaio RLS descartável','active')",
      [identity.id],
    );
    await login();
    await check(
      "legacy RLS: real identity and four positive owned records",
      async () => {
        await admin.query(
          "insert into public.comun_communities(id,slug,name,short_description,full_description,main_cta) values($1,$2,'Ensaio RLS','Somente laboratório','Fixture descartável','Conhecer')",
          [ids.community, "rls-" + ids.community],
        );
        await admin.query(
          "insert into public.comun_community_memberships(id,community_id,member_user_id,state) values($1,$2,$3,'member')",
          [ids.membership, ids.community, identity.id],
        );
        await admin.query(
          "insert into public.comun_community_role_assignments(id,membership_id,role,scope) values($1,$2,'coordinator','community')",
          [ids.role, ids.membership],
        );
        await admin.query(
          "insert into public.comun_collective_actions(id,community_id,slug,title,summary,objective,action_type,status,visibility,published_at) values($1,$2,$3,'Ação descartável','Somente ensaio RLS','Verificar fronteiras de sessão','volunteer_task_force','open','public',now())",
          [ids.action, ids.community, "rls-" + ids.action],
        );
        await admin.query(
          "insert into public.comun_collective_actions(id,community_id,slug,title,summary,objective,action_type,status,visibility,published_at) select $1,community_id,$2,title,summary,objective,action_type,status,visibility,published_at from public.comun_collective_actions where id=$3",
          [ids.extraAction, "rls-" + ids.extraAction, ids.action],
        );
        await admin.query(
          "insert into public.comun_collective_action_tasks(id,action_id,title,description) values($1,$2,'Outra tarefa descart�vel','Somente ensaio RLS')",
          [ids.extraTask, ids.action],
        );
        const participation = await client
          .from("comun_collective_action_participations")
          .insert({
            id: ids.participation,
            action_id: ids.action,
            member_user_id: identity.id,
            status: "participating",
          });
        assert(!participation.error);
        await admin.query(
          "insert into public.comun_collective_action_tasks(id,action_id,title,description) values($1,$2,'Tarefa descartável','Somente ensaio RLS')",
          [ids.task, ids.action],
        );
        const assignment = await client
          .from("comun_collective_action_task_assignments")
          .insert({
            id: ids.assignment,
            task_id: ids.task,
            member_user_id: identity.id,
            status: "active",
          });
        assert(!assignment.error);
        for (const [table, id] of tables)
          assert.equal((await probe(access, table, id)).rows, 1);
      },
    );
    // Baseline failures remain failures in the evidence; never label them mitigation PASS.
    await ban();
    await observe(access, "BANNED", true);
    await unban();
    await logout();
    await observe(access, "LOGGED_OUT", true);
    report.baselineFailures = report.baseline.filter(
      (row) => row.securityResult === "FAIL",
    ).length;
    await login();
    ownsSchema = true;
    await admin.query(
      await fs.readFile(
        "docs/proposals/m7c/legacy-session-rls-candidate.sql",
        "utf8",
      ),
    );
    await check(
      "legacy proposal: live own access retained; foreign/anonymous access still denied",
      async () => {
        const foreign = (await accounts[1].client.auth.getSession()).data
          .session.access_token;
        for (const [table, id] of tables) {
          assert.equal((await probe(access, table, id)).rows, 1);
          assert.equal((await probe(foreign, table, id)).rows, 0);
          assert.equal((await probe(local.ANON_KEY, table, id)).rows, 0);
        }
        assert.deepEqual(await grants(), originalGrants);
      },
    );
    await check(
      "legacy proposal: banned old JWT cannot read four tables or mutate responsibilities",
      async () => {
        await ban();
        await observe(access, "BANNED", false);
        assert.equal(
          (
            await admin.query(
              "select status from public.comun_member_profiles where user_id=$1",
              [identity.id],
            )
          ).rows[0].status,
          "active",
        );
      },
    );
    await check(
      "legacy proposal: real logout invalidates private access independently of ban",
      async () => {
        await unban();
        for (const [table, id] of tables)
          assert.equal((await probe(access, table, id)).rows, 1);
        await logout();
        await observe(access, "LOGGED_OUT", false);
      },
    );
    await check(
      "legacy proposal: restrictive AND gates preserve permissive policies and closed helper",
      async () => {
        const current = await policies();
        assert.deepEqual(
          current.filter(
            (row) => row.policyname !== "Live Auth session required",
          ),
          originalPolicies,
        );
        const added = current.filter(
          (row) => row.policyname === "Live Auth session required",
        );
        assert.equal(added.length, 4);
        assert(
          added.every(
            (row) =>
              row.permissive === "RESTRICTIVE" &&
              row.cmd === "ALL" &&
              JSON.stringify(row.roles) === '["authenticated"]',
          ),
        );
        assert.deepEqual(
          (
            await admin.query(
              "select has_function_privilege('anon','comun_auth_private.current_session_active()','execute') as anon,has_function_privilege('service_role','comun_auth_private.current_session_active()','execute') as service",
            )
          ).rows[0],
          { anon: false, service: false },
        );
        assert.deepEqual(await grants(), originalGrants);
        report.proposal = "PASS_DISPOSABLE_ONLY";
      },
    );
  } finally {
    const failures = [];
    for (const cleanup of [
      () => admin.query("rollback"),
      () =>
        ownsSchema
          ? admin.query("drop schema if exists comun_auth_private cascade")
          : Promise.resolve(),
      () =>
        admin.query(
          "delete from public.comun_collective_actions where id=any($1::uuid[])",
          [[ids.action, ids.extraAction]],
        ),
      () =>
        admin.query("delete from public.comun_communities where id=$1", [
          ids.community,
        ]),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    await check(
      "legacy proposal: original policies/grants restored and all owned fixtures absent",
      async () => {
        assert.equal(failures.length, 0);
        assert.deepEqual(await policies(), originalPolicies);
        assert.deepEqual(await grants(), originalGrants);
        assert(
          (
            await admin.query(
              "select to_regnamespace('comun_auth_private') is null as absent",
            )
          ).rows[0].absent,
        );
        for (const [table, id] of [
          ...tables,
          [tables[2][0], ids.extraParticipation],
          [tables[3][0], ids.extraAssignment],
          ["comun_collective_actions", ids.extraAction],
          ["comun_collective_action_tasks", ids.extraTask],
          ["comun_collective_actions", ids.action],
          ["comun_collective_action_tasks", ids.task],
          ["comun_communities", ids.community],
        ])
          assert.equal(
            (
              await admin.query(
                `select count(*)::int as n from public.${table} where id=$1`,
                [id],
              )
            ).rows[0].n,
            0,
          );
        report.cleanup = true;
        onCleanup(true);
      },
    );
  }
  return report;
}
