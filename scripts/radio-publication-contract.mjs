import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

// Only an explicitly supplied disposable local PostgreSQL database is accepted.
const url = new URL(
  process.env.COMUN_RADIO_CONTRACT_DATABASE_URL ?? "http://missing",
);
assert.ok(
  ["postgres:", "postgresql:"].includes(url.protocol),
  "explicit PostgreSQL URL required",
);
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "local disposable database required",
);
assert.equal(
  url.pathname,
  "/comun_radio_contract",
  "dedicated contract database required",
);
const fullSchema =
  process.env.COMUN_RADIO_CONTRACT_SCHEMA === "full_local_chain";
assert.ok(
  !process.env.COMUN_RADIO_CONTRACT_SCHEMA || fullSchema,
  "unknown contract schema mode",
);
const admin = new pg.Client({ connectionString: url.href });
const actor = randomUUID(),
  viewer = randomUUID();
const checks = [];
const service = new pg.Client({ connectionString: url.href });
let stage = "connect";
try {
  await admin.connect();
  if (fullSchema) {
    stage = "schema_guard";
    const marker = await admin.query(
      "select shobj_description(oid,'pg_database') as scope from pg_database where datname=current_database()",
    );
    assert.deepEqual(marker.rows, [{ scope: "full_local_chain_schema_only" }]);
    stage = "auth_fixture";
    await admin.query(
      "insert into auth.users(id,email) values($1,'editor@example.invalid'),($2,'viewer@example.invalid')",
      [actor, viewer],
    );
    stage = "admin_fixture";
    await admin.query(
      "insert into public.comun_admin_users(id,user_id,email,role,is_active) values($1,$1,'editor@example.invalid','editor',true),($2,$2,'viewer@example.invalid','viewer',true)",
      [actor, viewer],
    );
  } else {
    const existing = await admin.query(
      "select count(*)::int n from pg_tables where schemaname='public'",
    );
    assert.equal(existing.rows[0].n, 0, "refusing nonempty database");
    await admin.query(`
    create schema extensions;
    create extension pgcrypto with schema extensions;
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create table public.comun_archive_items(id uuid primary key default gen_random_uuid(),item_type text not null,title text,status text not null default 'draft',visibility text not null default 'private',published_at timestamptz);
    create table public.comun_archive_assets(id uuid primary key default gen_random_uuid(),archive_item_id uuid references public.comun_archive_items,asset_role text,bucket_scope text,review_status text,rights_status text,public_url text);
    create table public.comun_archive_agents(id uuid primary key);
    create table public.comun_hub_territories(id uuid primary key);
    create table public.comun_pauta_spaces(id uuid primary key);
    create table public.comun_mobilization_actions(id uuid primary key);
    create table public.comun_admin_users(id uuid primary key,email text,role text,is_active boolean);
    create table public.comun_admin_audit_log(id bigint generated always as identity primary key,admin_user_id uuid,admin_email text,action text,target_type text,target_id uuid,metadata jsonb);
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
  `);
    // Real canonical Radio tables, constraints, indexes, triggers, grants and RLS.
    // The archive/Auth/FK dependencies above are deliberately minimal fixtures.
    const foundation = readFileSync(
      new URL(
        "../supabase/migrations/20260715185344_community_radio_foundation.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await admin.query(
      foundation.slice(
        foundation.indexOf("create table public.comun_radio_programs"),
      ),
    );
    await admin.query(
      "grant usage on schema public,extensions to service_role;grant select,insert,update,delete on all tables in schema public to service_role;grant usage,select on all sequences in schema public to service_role",
    );
    await admin.query(
      "insert into public.comun_admin_users(id,email,role,is_active) values($1,'editor@example.invalid','editor',true),($2,'viewer@example.invalid','viewer',true)",
      [actor, viewer],
    );
  }
  const contract = readFileSync(
    new URL(
      "../supabase/reconciliation/radio-publication/01-editorial-identity.sql",
      import.meta.url,
    ),
    "utf8",
  );
  stage = "candidate_sql";
  await admin.query(contract);
  stage = "service_connection";
  await service.connect();
  await service.query("set role service_role");

  async function fixture() {
    const episode = randomUUID(),
      program = randomUUID();
    await admin.query(
      fullSchema
        ? "insert into public.comun_archive_items(id,item_type,slug,title) values($1::uuid,'community_radio_program',($1::uuid)::text,'Program'),($2::uuid,'community_radio_episode',($2::uuid)::text,'Episode')"
        : "insert into public.comun_archive_items(id,item_type) values($1,'community_radio_program'),($2,'community_radio_episode')",
      [program, episode],
    );
    await admin.query(
      "insert into public.comun_radio_episodes(archive_item_id,program_item_id,title_public,slug_public,summary_public,description_public,duration_seconds,publication_status,transcript_status) values($1::uuid,$2::uuid,'Episode',($1::uuid)::text,'Summary','Context',30,'editorial_review','published')",
      [episode, program],
    );
    await admin.query(
      fullSchema
        ? "insert into public.comun_archive_assets(archive_item_id,asset_role,bucket_scope,review_status,rights_status,public_url,object_key) values($1::uuid,'radio_public_episode','public_safe','approved','licensed','https://example.invalid/audio.mp3',($1::uuid)::text)"
        : "insert into public.comun_archive_assets(archive_item_id,asset_role,bucket_scope,review_status,rights_status,public_url) values($1,'radio_public_episode','public_safe','approved','licensed','https://example.invalid/audio.mp3')",
      [episode],
    );
    await admin.query(
      "insert into public.comun_radio_credits(episode_item_id,credit_role,public_credit) values($1,'host','Host')",
      [episode],
    );
    await admin.query(
      "insert into public.comun_radio_voice_consents(episode_item_id,consent_status,allow_comun_audio) values($1,'approved',true)",
      [episode],
    );
    await admin.query(
      "insert into public.comun_radio_transcript_versions(episode_item_id,version_number,transcript_type,content,status) values($1,1,'manual_editorial','Transcript','published')",
      [episode],
    );
    return episode;
  }
  async function prepare(episode, adminId = actor) {
    return (
      await service.query(
        "select public.comun_prepare_radio_publication_review($1,$2) value",
        [episode, adminId],
      )
    ).rows[0].value;
  }
  async function commit(episode, identity, client = service) {
    return (
      await client.query(
        "select public.comun_commit_radio_publication($1,$2,$3) value",
        [episode, identity, actor],
      )
    ).rows[0].value;
  }
  async function check(name, run) {
    stage = name;
    await run();
    checks.push(name);
  }

  await check("invoker and private execution permissions", async () => {
    const functions = await admin.query(
      "select proname,prosecdef,proconfig from pg_proc where proname = any($1::text[]) and pronamespace in ('public'::regnamespace,'private'::regnamespace)",
      [
        [
          "comun_radio_editorial_snapshot",
          "comun_radio_editorial_identity",
          "comun_radio_publication_blockers",
          "comun_lock_radio_editorial_composition",
          "comun_prepare_radio_publication_review",
          "comun_commit_radio_publication",
          "comun_publish_radio_episode",
        ],
      ],
    );
    assert.equal(functions.rows.length, 7);
    for (const row of functions.rows) {
      assert.equal(row.prosecdef, false);
      assert.deepEqual(row.proconfig, ["search_path=pg_catalog"]);
    }
    for (const role of ["anon", "authenticated"]) {
      const permissions = await admin.query(
        "select has_function_privilege($1,'public.comun_commit_radio_publication(uuid,text,uuid)','execute') permitted",
        [role],
      );
      assert.equal(permissions.rows[0].permitted, false);
    }
  });
  await check("viewer denied and active editor authorized", async () => {
    const episode = await fixture();
    assert.equal((await prepare(episode, viewer)).outcome, "denied");
    assert.equal((await prepare(episode)).outcome, "ready");
  });
  await check(
    "successful atomic publication and idempotent replay",
    async () => {
      const episode = await fixture(),
        review = await prepare(episode);
      assert.equal(
        (await commit(episode, review.identity)).outcome,
        "published",
      );
      const status = (
        await admin.query(
          "select e.publication_status,i.status,i.visibility from public.comun_radio_episodes e join public.comun_archive_items i on i.id=e.archive_item_id where i.id=$1",
          [episode],
        )
      ).rows[0];
      assert.deepEqual(status, {
        publication_status: "published",
        status: "published",
        visibility: "public",
      });
      assert.equal(
        (await commit(episode, review.identity)).outcome,
        "already_published",
      );
      const versions = await admin.query(
        "select count(*)::int n from public.comun_radio_editorial_versions where episode_item_id=$1",
        [episode],
      );
      assert.equal(versions.rows[0].n, 1);
    },
  );
  for (const [name, mutation, blocker] of [
    [
      "duration limit",
      "update public.comun_radio_episodes set duration_seconds=1801 where archive_item_id=$1",
      "duration_limit",
    ],
    [
      "unlicensed public asset",
      "update public.comun_archive_assets set rights_status='unknown' where archive_item_id=$1",
      "public_audio",
    ],
    [
      "expired consent",
      "update public.comun_radio_voice_consents set valid_until=current_date-1 where episode_item_id=$1",
      "voice_consent",
    ],
    [
      "future consent",
      "update public.comun_radio_voice_consents set valid_from=current_date+1 where episode_item_id=$1",
      "voice_consent",
    ],
    [
      "withdrawal requested",
      "update public.comun_radio_voice_consents set withdrawal_requested_at=now() where episode_item_id=$1",
      "voice_consent",
    ],
    [
      "missing transcript",
      "delete from public.comun_radio_transcript_versions where episode_item_id=$1",
      "transcript",
    ],
    [
      "pending safety without minor",
      "insert into public.comun_radio_safety_reviews(episode_item_id,reinforced_review_status) values($1,'pending')",
      "minor_safety",
    ],
    [
      "minor without reinforced approval",
      "insert into public.comun_radio_safety_reviews(episode_item_id,minor_involved_private) values($1,true)",
      "minor_safety",
    ],
  ])
    await check(name, async () => {
      const episode = await fixture();
      await admin.query(mutation, [episode]);
      const review = await prepare(episode);
      assert.equal(review.outcome, "blocked");
      assert.ok(review.blockers.includes(blocker));
      assert.equal((await commit(episode, review.identity)).outcome, "blocked");
    });
  for (const [name, mutation] of [
    [
      "asset rights",
      "update public.comun_archive_assets set rights_status='unknown' where archive_item_id=$1",
    ],
    [
      "consent",
      "update public.comun_radio_voice_consents set allow_comun_audio=false where episode_item_id=$1",
    ],
    [
      "transcript",
      "update public.comun_radio_transcript_versions set content='Changed transcript' where episode_item_id=$1",
    ],
    [
      "credits",
      "update public.comun_radio_credits set public_credit='Changed credit' where episode_item_id=$1",
    ],
    [
      "music",
      "insert into public.comun_radio_music_uses(episode_item_id,title_public,usage_type,rights_status,allow_streaming) values($1,'Track','background','pending',false)",
    ],
    [
      "safety",
      "insert into public.comun_radio_safety_reviews(episode_item_id,minor_involved_private,reinforced_review_status) values($1,true,'pending')",
    ],
    [
      "episode",
      "update public.comun_radio_episodes set summary_public='Changed summary' where archive_item_id=$1",
    ],
    [
      "episode slug",
      "update public.comun_radio_episodes set slug_public='changed-'||slug_public where archive_item_id=$1",
    ],
    [
      "episode download permission",
      "update public.comun_radio_episodes set allow_download=true where archive_item_id=$1",
    ],
    [
      "archive root title",
      "update public.comun_archive_items set title='Changed archive title' where id=$1",
    ],
  ])
    await check(`concurrent stale ${name}`, async () => {
      const episode = await fixture(),
        review = await prepare(episode);
      const mutator = new pg.Client({ connectionString: url.href });
      const publisher = new pg.Client({ connectionString: url.href });
      await mutator.connect();
      await publisher.connect();
      let pending;
      try {
        await mutator.query("begin");
        await mutator.query(mutation, [episode]);
        await publisher.query("set role service_role");
        pending = commit(episode, review.identity, publisher);
        const deadline = Date.now() + 5000;
        let locked = false;
        while (Date.now() < deadline) {
          const state = await admin.query(
            "select wait_event_type from pg_stat_activity where pid=$1",
            [publisher.processID],
          );
          if (state.rows[0]?.wait_event_type === "Lock") {
            locked = true;
            break;
          }
          await new Promise(setImmediate);
        }
        assert.ok(locked, "deterministic lock barrier must be observed");
        await mutator.query("commit");
        assert.equal((await pending).outcome, "conflict");
        const state = await admin.query(
          "select publication_status from public.comun_radio_episodes where archive_item_id=$1",
          [episode],
        );
        assert.equal(state.rows[0].publication_status, "editorial_review");
        const audit = await admin.query(
          "select count(*)::int n from public.comun_admin_audit_log where target_id=$1 and action='radio_episode_publish_stale'",
          [episode],
        );
        assert.equal(audit.rows[0].n, 1);
      } finally {
        await mutator.query("rollback");
        if (pending) await pending;
        await mutator.end();
        await publisher.end();
      }
    });
  await check(
    "failure after episode update rolls back every publication write",
    async () => {
      const episode = await fixture(),
        review = await prepare(episode);
      await admin.query(
        `create function public.contract_reject_version() returns trigger language plpgsql as $$ begin raise exception 'contract injected failure';end $$;create trigger contract_reject_version before insert on public.comun_radio_editorial_versions for each row execute function public.contract_reject_version()`,
      );
      try {
        await assert.rejects(
          commit(episode, review.identity),
          /contract injected failure/,
        );
      } finally {
        await admin.query(
          "drop trigger contract_reject_version on public.comun_radio_editorial_versions;drop function public.contract_reject_version()",
        );
      }
      const state = (
        await admin.query(
          "select e.publication_status,i.status,i.visibility from public.comun_radio_episodes e join public.comun_archive_items i on i.id=e.archive_item_id where i.id=$1",
          [episode],
        )
      ).rows[0];
      assert.deepEqual(state, {
        publication_status: "editorial_review",
        status: "draft",
        visibility: "private",
      });
      const audit = await admin.query(
        "select count(*)::int n from public.comun_admin_audit_log where target_id=$1",
        [episode],
      );
      assert.equal(audit.rows[0].n, 0);
    },
  );
  const compositionTables = [
    "comun_archive_items",
    "comun_radio_episodes",
    "comun_archive_assets",
    "comun_radio_credits",
    "comun_radio_voice_consents",
    "comun_radio_music_uses",
    "comun_radio_safety_reviews",
    "comun_radio_transcript_versions",
    "comun_radio_editorial_versions",
  ].sort();
  for (const phase of ["prepare", "commit"]) {
    await check(
      `${phase} global lock impact and transaction release`,
      async () => {
        const episode = await fixture();
        const unrelated = await fixture();
        const review = await prepare(episode);
        const holder = new pg.Client({ connectionString: url.href });
        const writer = new pg.Client({ connectionString: url.href });
        const reader = new pg.Client({ connectionString: url.href });
        let pending;
        try {
          await holder.connect();
          await writer.connect();
          await reader.connect();
          for (const client of [holder, writer, reader]) {
            await client.query("set role service_role");
            await client.query("set statement_timeout='10s'");
          }
          await holder.query("begin");
          const result =
            phase === "prepare"
              ? (
                  await holder.query(
                    "select public.comun_prepare_radio_publication_review($1,$2) value",
                    [episode, actor],
                  )
                ).rows[0].value
              : await commit(episode, review.identity, holder);
          assert.equal(
            result.outcome,
            phase === "prepare" ? "ready" : "published",
          );
          const locks = await admin.query(
            "select c.relname from pg_locks l join pg_class c on c.oid=l.relation join pg_namespace n on n.oid=c.relnamespace where l.pid=$1 and l.granted and l.mode='ShareRowExclusiveLock' and n.nspname='public' order by c.relname",
            [holder.processID],
          );
          assert.deepEqual(
            locks.rows.map((row) => row.relname),
            compositionTables,
          );

          // This is an ordinary database read, not a public RLS authorization test.
          await reader.query("set lock_timeout='1s'");
          const readable = await reader.query(
            "select id from public.comun_archive_items where id=$1",
            [unrelated],
          );
          assert.equal(readable.rowCount, 1);
          await writer.query("set lock_timeout='5s'");
          pending = writer
            .query(
              "update public.comun_archive_items set title=title where id=$1",
              [unrelated],
            )
            .then(
              (value) => ({ value }),
              (error) => ({ error }),
            );
          const deadline = Date.now() + 3000;
          let blockedByHolder = false;
          while (Date.now() < deadline) {
            const waiting = await admin.query(
              "select $2::int=any(pg_blocking_pids($1::int)) as blocked",
              [writer.processID, holder.processID],
            );
            if (waiting.rows[0].blocked) {
              blockedByHolder = true;
              break;
            }
            await new Promise(setImmediate);
          }
          assert.ok(
            blockedByHolder,
            "unrelated archive write must wait for this transaction",
          );
          await holder.query("commit");
          const completed = await pending;
          assert.ifError(completed.error);
          assert.equal(completed.value.rowCount, 1);
          const remaining = await admin.query(
            "select count(*)::int n from pg_locks where pid=$1 and mode='ShareRowExclusiveLock'",
            [holder.processID],
          );
          assert.equal(remaining.rows[0].n, 0);
        } finally {
          // Release the blocker before waiting for the writer, including on failure.
          try {
            await holder.query("rollback");
          } finally {
            if (pending) await pending;
            const closed = await Promise.allSettled([
              holder.end(),
              writer.end(),
              reader.end(),
            ]);
            for (const result of closed) {
              if (result.status === "rejected") throw result.reason;
            }
          }
        }
      },
    );
  }
  console.log(
    JSON.stringify({
      status: "passed",
      checks: checks.length,
      scope: fullSchema
        ? "disposable_supabase_full_local_migration_chain"
        : "disposable_postgresql_minimal_dependencies",
      names: checks,
      lockImpact: {
        scope: "global_composition_tables",
        tableCount: compositionTables.length,
        phases: ["prepare", "commit"],
        unrelatedArchiveWrites: "blocked_until_transaction_end",
        ordinaryReads: "available",
        locksAfterTransaction: "released",
        productionLatencyMeasured: false,
        productionActivationReady: false,
      },
    }),
  );
} catch (error) {
  const identifier = (value) =>
    typeof value === "string" && /^[A-Za-z0-9_]{1,100}$/.test(value)
      ? value
      : undefined;
  console.error(
    JSON.stringify({
      status: "failed",
      completedChecks: checks.length,
      stage,
      code: identifier(error.code),
      table: identifier(error.table),
      column: identifier(error.column),
      constraint: identifier(error.constraint),
    }),
  );
  process.exitCode = 1;
} finally {
  await service.end();
  // Database and any test roles are owned by the disposable runner, never production.
  await admin.end();
}
