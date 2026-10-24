/** Canonical public task lifecycle through real Auth/PostgREST/RLS, CI fixtures only. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function rehearseFullSchemaTasks({
  admin,
  accounts,
  check,
  onCleanup,
}) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  const [a, b] = accounts;
  for (const person of [a, b])
    assert.equal((await person.client.auth.getUser()).data.user?.id, person.id);
  const community = randomUUID(),
    action = randomUUID();
  const tasks = [randomUUID(), randomUUID()];
  const membership = randomUUID();
  const assignments = [];
  const read = () =>
    a.client
      .from("comun_collective_action_task_assignments")
      .select("id,task_id,member_user_id,status,released_at,created_at")
      .in("task_id", tasks);
  const ok = (response) => {
    assert(!response.error, response.error?.code);
    return response.data;
  };
  try {
    await check(
      "canonical tasks: public participation and voluntary claims, real Auth",
      async () => {
        await admin.query(
          "insert into public.comun_communities(id,slug,name,short_description,full_description,main_cta) values($1,$2,'Ensaio descartável','Comunidade sintética','Somente laboratório de continuidade','Conhecer')",
          [community, "task-" + community],
        );
        await admin.query(
          "insert into public.comun_community_memberships(id,community_id,member_user_id,state) values($1,$2,$3,'member')",
          [membership, community, a.id],
        );
        await admin.query(
          "insert into public.comun_collective_actions(id,community_id,slug,title,summary,objective,action_type,status,visibility,published_at) values($1,$2,$3,'Ação sintética','Ensaio descartável de continuidade','Verificar devolução voluntária','volunteer_task_force','open','public',now())",
          [action, community, "task-" + action],
        );
        for (const task of tasks)
          await admin.query(
            "insert into public.comun_collective_action_tasks(id,action_id,title,description) values($1,$2,'Tarefa sintética','Responsabilidade descartável')",
            [task, action],
          );
        for (const person of [a, b])
          ok(
            await person.client
              .from("comun_collective_action_participations")
              .insert({
                action_id: action,
                member_user_id: person.id,
                status: "participating",
              })
              .select("id")
              .single(),
          );
        for (const task of tasks)
          assignments.push(
            ok(
              await a.client
                .from("comun_collective_action_task_assignments")
                .insert({
                  task_id: task,
                  member_user_id: a.id,
                  status: "active",
                })
                .select("id,task_id,created_at")
                .single(),
            ),
          );
        assert.equal(ok(await read()).length, 2);
      },
    );
    await check(
      "canonical tasks: B cannot read, impersonate or return A assignments",
      async () => {
        assert.deepEqual(
          ok(
            await b.client
              .from("comun_collective_action_task_assignments")
              .select("*")
              .in("task_id", tasks),
          ),
          [],
        );
        assert(
          (
            await b.client
              .from("comun_collective_action_task_assignments")
              .insert({
                task_id: tasks[0],
                member_user_id: a.id,
                status: "active",
              })
          ).error,
        );
        assert.deepEqual(
          ok(
            await b.client
              .from("comun_collective_action_task_assignments")
              .update({
                status: "released",
                released_at: new Date().toISOString(),
              })
              .eq("id", assignments[0].id)
              .select("id"),
          ),
          [],
        );
        assert(ok(await read()).every((row) => row.status === "active"));
      },
    );
    await check(
      "canonical tasks: withdrawal requires returning active responsibilities",
      async () => {
        const response = await a.client
          .from("comun_collective_action_participations")
          .update({ status: "withdrew" })
          .eq("action_id", action);
        assert(
          response.error?.message.includes("RELEASE_TASKS_BEFORE_LEAVING"),
        );
      },
    );
    await check(
      "canonical tasks: returning cannot change assignment identity",
      async () => {
        const response = await a.client
          .from("comun_collective_action_task_assignments")
          .update({
            task_id: tasks[1],
            status: "released",
            released_at: new Date().toISOString(),
          })
          .eq("id", assignments[0].id);
        assert.equal(response.error?.code, "23514");
        assert(ok(await read()).every((row) => row.status === "active"));
      },
    );
    await check(
      "canonical tasks: paused membership retains responsibility and permits own return",
      async () => {
        await admin.query(
          "update public.comun_community_memberships set state='paused',paused_at=now() where id=$1",
          [membership],
        );
        assert(ok(await read()).every((row) => row.status === "active"));
        assert.deepEqual(
          ok(
            await a.client
              .from("comun_collective_action_task_assignments")
              .update({
                status: "released",
                released_at: new Date().toISOString(),
              })
              .eq("id", assignments[0].id)
              .select("id"),
          ),
          [{ id: assignments[0].id }],
        );
      },
    );
    await check(
      "canonical tasks: after exit and internal closure owner can still return",
      async () => {
        await admin.query(
          "update public.comun_community_memberships set state='left',left_at=now() where id=$1",
          [membership],
        );
        await admin.query(
          "update public.comun_collective_actions set status='archived',visibility='internal' where id=$1",
          [action],
        );
        assert.deepEqual(
          ok(
            await a.client
              .from("comun_collective_actions")
              .select("id")
              .eq("id", action),
          ),
          [],
        );
        assert.deepEqual(
          ok(
            await a.client
              .from("comun_collective_action_task_assignments")
              .update({
                status: "released",
                released_at: new Date().toISOString(),
              })
              .eq("id", assignments[1].id)
              .select("id"),
          ),
          [{ id: assignments[1].id }],
        );
        assert.deepEqual(
          ok(
            await a.client
              .from("comun_collective_action_participations")
              .update({ status: "withdrew" })
              .eq("action_id", action)
              .select("status"),
          ),
          [{ status: "withdrew" }],
        );
      },
    );
    await check(
      "canonical tasks: no reactivation, reassignment or lost history after exit",
      async () => {
        assert.deepEqual(
          ok(
            await a.client
              .from("comun_collective_action_task_assignments")
              .update({ status: "active", released_at: null })
              .in("task_id", tasks)
              .select("id"),
          ),
          [],
        );
        const rows = ok(await read());
        assert.equal(rows.length, 2);
        for (const original of assignments) {
          const row = rows.find((item) => item.id === original.id);
          assert(row && row.status === "released" && row.released_at);
          assert.equal(row.member_user_id, a.id);
          assert.equal(row.task_id, original.task_id);
          assert.equal(row.created_at, original.created_at);
        }
        assert.deepEqual(
          ok(
            await b.client
              .from("comun_collective_action_task_assignments")
              .select("*")
              .in("task_id", tasks),
          ),
          [],
        );
      },
    );
  } finally {
    // Exact owned IDs; action cascade removes only its tasks, assignments and participations.
    const failures = [];
    for (const [table, id] of [
      ["comun_collective_actions", action],
      ["comun_communities", community],
    ]) {
      try {
        await admin.query(`delete from public.${table} where id=$1`, [id]);
      } catch (error) {
        failures.push(error);
      }
    }
    await check(
      "canonical tasks: owned fixtures and dependent records are absent",
      async () => {
        assert.equal(failures.length, 0);
        for (const [table, column, ids] of [
          ["comun_collective_actions", "id", [action]],
          ["comun_collective_action_tasks", "id", tasks],
          ["comun_collective_action_task_assignments", "task_id", tasks],
          ["comun_collective_action_participations", "action_id", [action]],
          ["comun_community_memberships", "id", [membership]],
          ["comun_communities", "id", [community]],
        ])
          assert.equal(
            (
              await admin.query(
                `select count(*)::int as n from public.${table} where ${column}=any($1::uuid[])`,
                [ids],
              )
            ).rows[0].n,
            0,
          );
        onCleanup(true);
      },
    );
  }
}
