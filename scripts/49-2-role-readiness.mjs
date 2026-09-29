import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/comun-49-2-role-readiness.json";
const expectedMainSha = process.env.COMUN_49_2_EXPECTED_MAIN_SHA;
const url = process.env.SUPABASE_DB_URL;

if (!url || !/^[a-f0-9]{40}$/.test(expectedMainSha ?? "")) {
  throw new Error("COMUN_49_2_ROLE_READINESS_CONTEXT_INVALID");
}

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const readOnly = (
    await db.query("select current_setting('transaction_read_only') as value")
  ).rows[0]?.value;
  if (readOnly !== "on")
    throw new Error("COMUN_49_2_ROLE_READINESS_NOT_READ_ONLY");

  const roleCounts = (
    await db.query(`
      with active_profiles as (
        select profile.role, profile.auth_user_id,
          exists (
            select 1
              from public.comun_admin_users admin_user
             where admin_user.user_id=profile.auth_user_id
               and admin_user.is_active
          ) as has_active_admin_user
          from public.comun_admin_profiles profile
         where profile.active
      )
      select role,
        count(*)::int as active_profiles,
        count(*) filter (
          where auth_user_id is not null
            and has_active_admin_user
        )::int as operational_profiles
      from active_profiles
      group by role
      order by role
    `)
  ).rows;

  const summary = (
    await db.query(`
      with operational as (
        select profile.id,profile.role
          from public.comun_admin_profiles profile
          join public.comun_admin_users admin_user
            on admin_user.user_id=profile.auth_user_id
           and admin_user.is_active
         where profile.active
      )
      select
        (select count(*)::int from public.comun_admin_users where is_active)
          as active_admin_users,
        count(*) filter (
          where role in ('admin','editor','factual_reviewer')
        )::int as reviewer_capable,
        count(*) filter (where role='publisher')::int as publisher_capable,
        (count(*) filter (
          where role in ('admin','editor','factual_reviewer')
        ) >= 2) as distinct_reviewer_capacity
      from operational
    `)
  ).rows[0];

  const document = {
    checkpoint: "COMUN_49_2_ROLE_READINESS_READ_ONLY",
    expectedMainSha,
    transactionReadOnly: readOnly,
    activeAdminUsers: Number(summary.active_admin_users ?? 0),
    reviewerCapable: Number(summary.reviewer_capable ?? 0),
    publisherCapable: Number(summary.publisher_capable ?? 0),
    distinctReviewerCapacity: Boolean(summary.distinct_reviewer_capacity),
    roles: roleCounts.map((row) => ({
      role: row.role,
      activeProfiles: Number(row.active_profiles),
      operationalProfiles: Number(row.operational_profiles),
    })),
  };

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(document, null, 2) + "\n");
  console.log(document.checkpoint);
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
