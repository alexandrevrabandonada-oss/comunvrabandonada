/** Candidate SQL exercised through real GoTrue sessions and PostgREST.
 * Invoked only by the owned M6 lab; no external database/credential input.
 * Superuser is used solely for explicit synthetic fixture administration.
 */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import pg from "pg";
import {
  NUCLEUS_CONSENT_NOTICE_SHA256,
  NUCLEUS_CONSENT_VERSION,
} from "../../lib/community-nucleus-contract.ts";

export async function rehearseNucleusCandidate({
  accounts,
  service,
  check,
  owner,
  password,
}) {
  assert(process.env.COMUN_M7C === "1" && owner.startsWith("comun-m6-"));
  assert.equal(process.env.COMUN_M7C_DB_HOST, owner + "-pg");
  assert.equal(
    accounts.length,
    3,
    "Two protagonists and an independent synthetic reviewer required",
  );
  const [a, b, c] = accounts;
  for (const account of accounts)
    assert.equal(
      (await account.client.auth.getUser()).data.user?.id,
      account.id,
    );
  const admin = new pg.Client({
    host: owner + "-pg",
    port: 5432,
    user: "postgres",
    password,
    database: "postgres",
    ssl: false,
  });
  await admin.connect();
  const sql = (q, args = []) => admin.query(q, args);
  const callArgs = (name, args) =>
    name === "request_entry"
      ? {
          rules: "lab-v1",
          purpose_digest: createHash("sha256")
            .update(
              args.nucleus === x
                ? "Synthetic cooperation purpose"
                : "Independent synthetic purpose",
              "utf8",
            )
            .digest("hex"),
          ...args,
        }
      : args;
  const rpc = async (who, name, args) => {
    const r = await who.client
      .schema("comun_org_private")
      .rpc(name, callArgs(name, args));
    assert(
      !r.error,
      `M7 candidate ${name}: ${r.error?.code}/${r.error?.message}`,
    );
    return r.data;
  };
  const denied = async (who, name, args) =>
    assert(
      (
        await who.client
          .schema("comun_org_private")
          .rpc(name, callArgs(name, args))
      ).error,
      `M7 expected denied: ${name}`,
    );
  const rows = async (who, table, columns, filter = {}) => {
    let q = who.client.schema("comun_org_private").from(table).select(columns);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const r = await q;
    assert(!r.error, `M7 read ${table}: ${r.error?.code}/${r.error?.message}`);
    return r.data;
  };
  const allowReview = async (request, reviewer) => {
    const r = await sql(
      `insert into comun_org_private.reviewer_authorizations(request_id,nucleus_id,community_id,subject_user_id,reviewer_user_id,ends_at,basis_ref)
    select id,nucleus_id,community_id,user_id,$2,now()+interval '1 day','lab-governance-fixture-only' from comun_org_private.requests where id=$1 returning id`,
      [request, reviewer.id],
    );
    return r.rows[0].id;
  };
  const request = (who) =>
    rpc(who, "request_entry", {
      nucleus: x,
      version: NUCLEUS_CONSENT_VERSION,
      digest: NUCLEUS_CONSENT_NOTICE_SHA256,
      affirmative: true,
    });
  const community = randomUUID(),
    otherCommunity = randomUUID(),
    x = randomUUID(),
    y = randomUUID();
  try {
    await sql(
      "insert into public.comun_communities(id,slug,name) values($1,'m7-lab-x','Synthetic X'),($2,'m7-lab-y','Synthetic Y')",
      [community, otherCommunity],
    );
    for (const person of accounts)
      for (const scope of [community, otherCommunity])
        await sql(
          "insert into public.comun_community_memberships(id,community_id,member_user_id,state) values($1,$2,$3,$4)",
          [
            randomUUID(),
            scope,
            person.id,
            person === a ? "following" : "member",
          ],
        );
    await sql(
      "insert into comun_org_private.nuclei(id,community_id,purpose,rules_version,state) values($1,$2,'Synthetic cooperation purpose','lab-v1','active'),($3,$4,'Independent synthetic purpose','lab-v1','active')",
      [x, community, y, otherCommunity],
    );
    let qa, ea, qb, eb, ma, offer, authB, authC;
    await check(
      "M7 real Auth: following community never creates nucleus admission",
      async () => {
        await denied(a, "request_entry", {
          nucleus: x,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
        });
        assert.deepEqual(await rows(a, "enrollments", "id,state"), []);
        await sql(
          "update public.comun_community_memberships set state='member' where member_user_id=$1 and community_id=$2",
          [a.id, community],
        );
        await denied(a, "request_entry", {
          nucleus: x,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: false,
        });
        await denied(a, "request_entry", {
          nucleus: x,
          version: NUCLEUS_CONSENT_VERSION,
          digest: "0".repeat(64),
          affirmative: true,
        });
        qa = await request(a);
        await denied(a, "request_entry", {
          nucleus: x,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
          rules: "stale-rules",
        });
        await denied(a, "request_entry", {
          nucleus: x,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
          purpose_digest: "0".repeat(64),
        });
        assert.deepEqual(await rows(a, "enrollments", "id,state"), []);
      },
    );
    await check(
      "M7 real RLS: unauthorized B, self-review, anonymous/service and cross-nucleus reads denied",
      async () => {
        await denied(b, "review_entry", { request: qa, decision: "approved" });
        await denied(a, "review_entry", { request: qa, decision: "approved" });
        assert.deepEqual(await rows(b, "requests", "id"), []);
        assert.deepEqual(await rows(b, "consents", "id"), []);
        for (const [table, column] of [
          ["mandates", "offered_by"],
          ["succession_offers", "proposed_by"],
          ["audit_events", "actor_user_id"],
        ]) {
          assert(
            (
              await a.client
                .schema("comun_org_private")
                .from(table)
                .select(column)
            ).error,
          );
        }
        assert(
          (
            await service
              .schema("comun_org_private")
              .from("consents")
              .select("id")
          ).error,
        );
        for (const table of [
          "nuclei",
          "reviews",
          "reviewer_authorizations",
          "succession_decisions",
        ])
          assert(
            (await a.client.schema("comun_org_private").from(table).select("*"))
              .error,
          );
        assert(
          (
            await a.client
              .schema("comun_org_private")
              .from("requests")
              .select("consent_id")
          ).error,
        );
        assert(
          (
            await a.client
              .schema("comun_org_private")
              .from("reviewer_authorizations")
              .insert({ reviewer_user_id: a.id })
          ).error,
        );
        await denied(a, "request_entry", {
          nucleus: y,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
        });
        const anon = await fetch(
          `http://127.0.0.1:54329/rest/v1/consents?select=id`,
          { headers: { "Accept-Profile": "comun_org_private" } },
        );
        assert(anon.status >= 400);
      },
    );
    await check(
      "M7 request-scoped reviewer summary, independent approval and immutable review chain",
      async () => {
        authB = await allowReview(qa, b);
        assert.equal((await rows(b, "requests", "id", { id: qa })).length, 1);
        assert.deepEqual(await rows(b, "consents", "id"), []);
        ea = await rpc(b, "review_entry", {
          request: qa,
          decision: "approved",
        });
        assert(ea);
        await denied(b, "review_entry", { request: qa, decision: "approved" });
        await assert.rejects(
          sql(
            "update comun_org_private.reviews set decision='rejected' where request_id=$1",
            [qa],
          ),
        );
        await assert.rejects(
          sql(
            "insert into comun_org_private.reviewer_authorizations(request_id,nucleus_id,community_id,subject_user_id,reviewer_user_id,ends_at,basis_ref) values($1,$2,$3,$4,$4,now()+interval '1 day','lab-self-review-denied')",
            [qa, x, community, a.id],
          ),
        );
        await sql("begin");
        try {
          const extra = await sql(
            "insert into comun_org_private.consents(nucleus_id,community_id,user_id,notice_version,notice_sha256,rules_version,purpose_sha256) select nucleus_id,community_id,user_id,notice_version,notice_sha256,rules_version,purpose_sha256 from comun_org_private.consents where user_id=$1 returning id",
            [a.id],
          );
          await assert.rejects(
            sql(
              "insert into comun_org_private.requests(consent_id,nucleus_id,community_id,user_id) values($1,$2,$3,$4)",
              [extra.rows[0].id, y, community, a.id],
            ),
            (error) => error.code === "23503",
          );
        } finally {
          await sql("rollback");
        }
      },
    );
    await check(
      "M7 mandate: offer is not power; only holder accepts; bounded term and revocation",
      async () => {
        ma = await rpc(b, "offer_mandate", {
          enrollment: ea,
          responsibility: "facilitation",
          ends: new Date(Date.now() + 3600000).toISOString(),
        });
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), false);
        await denied(b, "respond_mandate", { mandate: ma, accept: true });
        await rpc(a, "respond_mandate", { mandate: ma, accept: true });
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), true);
        await denied(b, "offer_mandate", {
          enrollment: ea,
          responsibility: "overlong-window",
          ends: new Date(Date.now() + 100 * 86400000).toISOString(),
        });
        const second = await rpc(b, "offer_mandate", {
          enrollment: ea,
          responsibility: "care",
          ends: new Date(Date.now() + 3600000).toISOString(),
        });
        await rpc(a, "respond_mandate", { mandate: second, accept: false });
        await denied(a, "respond_mandate", { mandate: second, accept: true });
      },
    );
    await check(
      "M7 two nuclei: reviewer authority cannot be reused across scope or requests",
      async () => {
        qb = await request(b);
        await denied(b, "review_entry", { request: qb, decision: "approved" });
        await denied(a, "review_entry", { request: qb, decision: "approved" });
        authC = await allowReview(qb, c);
        eb = await rpc(c, "review_entry", {
          request: qb,
          decision: "approved",
        });
        const other = await rpc(b, "request_entry", {
          nucleus: y,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
        });
        assert.deepEqual(await rows(c, "requests", "id", { id: other }), []);
        await denied(c, "review_entry", {
          request: other,
          decision: "approved",
        });
        for (const [start, end] of [
          ["-2 days", "-1 day"],
          ["+1 hour", "+2 hours"],
        ]) {
          await sql(
            `insert into comun_org_private.reviewer_authorizations(request_id,nucleus_id,community_id,subject_user_id,reviewer_user_id,starts_at,ends_at,basis_ref)
          select id,nucleus_id,community_id,user_id,$2,now()+$3::interval,now()+$4::interval,'lab-expiry-fixture' from comun_org_private.requests where id=$1`,
            [other, c.id, start, end],
          );
        }
        assert.equal(await rpc(c, "can_review", { r: other }), false);
        await denied(c, "review_entry", {
          request: other,
          decision: "approved",
        });
        assert.deepEqual(
          await rows(a, "enrollments", "id", { nucleus_id: y }),
          [],
        );
      },
    );
    await check(
      "M7 mandate expiry, future acceptance, voluntary return and reviewer revocation are enforced in PostgreSQL",
      async () => {
        for (const [role, offered, accepted, starts, ends] of [
          ["expired-proof", "-3 days", "-2 days", "-2 days", "-1 day"],
          ["future-proof", "-1 hour", "+1 hour", "-1 hour", "+2 hours"],
        ]) {
          const r = await sql(
            `insert into comun_org_private.mandates(enrollment_id,nucleus_id,community_id,user_id,role,state,offered_by,offered_at,accepted_at,accepted_by,starts_at,ends_at)
        values($1,$2,$3,$4,$5,'active',$6,now()+$7::interval,now()+$8::interval,$4,now()+$9::interval,now()+$10::interval) returning id`,
            [
              ea,
              x,
              community,
              a.id,
              role,
              b.id,
              offered,
              accepted,
              starts,
              ends,
            ],
          );
          assert.equal(
            await rpc(a, "mandate_active", { mandate: r.rows[0].id }),
            false,
          );
        }
        for (const mode of ["completed", "revoked"]) {
          const m = await rpc(b, "offer_mandate", {
            enrollment: ea,
            responsibility: "cycle-" + mode,
            ends: new Date(Date.now() + 3600000).toISOString(),
          });
          await rpc(a, "respond_mandate", { mandate: m, accept: true });
          await rpc(mode === "completed" ? a : b, "end_mandate", {
            mandate: m,
            next_state: mode,
          });
          assert.equal(await rpc(a, "mandate_active", { mandate: m }), false);
          await denied(a, "respond_mandate", { mandate: m, accept: true });
        }
      },
    );
    await check(
      "M7 succession acceptance needs independent review and never transfers mandate/tasks/private memory",
      async () => {
        offer = await rpc(a, "offer_succession", {
          mandate: ma,
          candidate: eb,
          expires: new Date(Date.now() + 1800000).toISOString(),
        });
        await denied(a, "respond_succession", { offer, accept: true });
        await rpc(b, "respond_succession", { offer, accept: true });
        await denied(b, "review_succession", { offer, decision: "approved" });
        await denied(a, "review_succession", { offer, decision: "approved" });
        await rpc(c, "review_succession", { offer, decision: "approved" });
        assert.equal((await rows(b, "mandates", "id")).length, 0);
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), true);
        assert.equal(
          (
            await sql(
              "select count(*)::int as n from comun_org_private.succession_decisions where offer_id=$1",
              [offer],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await check(
      "M7 revoked reviewer and suspended profile lose reads/powers with existing sessions",
      async () => {
        await sql(
          "update comun_org_private.reviewer_authorizations set revoked_at=now() where id=$1",
          [authC],
        );
        assert.deepEqual(await rows(c, "requests", "id", { id: qb }), []);
        await sql(
          "update public.comun_member_profiles set status='suspended' where user_id=$1",
          [a.id],
        );
        assert.deepEqual(await rows(a, "consents", "id"), []);
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), false);
        await sql(
          "update public.comun_member_profiles set status='active' where user_id=$1",
          [a.id],
        );
      },
    );
    await check(
      "M7 pause/exit remove powers; minimum own receipts survive; historical enrollment never resurrects",
      async () => {
        await rpc(a, "leave_entry", { enrollment: ea, next_state: "paused" });
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), false);
        assert.equal((await rows(a, "consents", "id")).length, 1);
        assert.deepEqual(
          await rows(b, "enrollments", "id", { user_id: a.id }),
          [],
        );
        await assert.rejects(
          sql(
            "update comun_org_private.enrollments set state='active',ended_at=null where id=$1",
            [ea],
          ),
        );
        await rpc(a, "leave_entry", { enrollment: ea, next_state: "left" });
        assert((await rows(a, "consents", "withdrawn_at"))[0].withdrawn_at);
        assert(
          (
            await a.client
              .schema("comun_org_private")
              .from("enrollments")
              .update({ state: "active" })
              .eq("id", ea)
          ).error,
        );
        const fresh = await request(a);
        assert.notEqual(fresh, qa);
        await denied(b, "review_entry", {
          request: fresh,
          decision: "approved",
        });
        await allowReview(fresh, b);
        const next = await rpc(b, "review_entry", {
          request: fresh,
          decision: "approved",
        });
        assert.notEqual(next, ea);
        assert.equal(await rpc(a, "mandate_active", { mandate: ma }), false);
        await sql(
          "update comun_org_private.reviews set revoked_at=now() where request_id=$1",
          [fresh],
        );
        assert.equal(await rpc(a, "enrollment_active", { e: next }), false);
      },
    );
    await check(
      "M7 reviewer revoked while review waits cannot commit a decision or enrollment",
      async () => {
        const nucleus = randomUUID();
        await sql(
          "insert into comun_org_private.nuclei(id,community_id,purpose,rules_version,state) values($1,$2,'Independent synthetic purpose','lab-v1','active')",
          [nucleus, community],
        );
        const q = await rpc(a, "request_entry", {
          nucleus,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
        });
        const authority = await allowReview(q, b);
        let pending, response;
        await sql("begin");
        try {
          await sql(
            "select id from comun_org_private.reviewer_authorizations where id=$1 for update",
            [authority],
          );
          pending = Promise.resolve(
            b.client.schema("comun_org_private").rpc("review_entry", {
              request: q,
              decision: "approved",
            }),
          );
          // Prove an actual overlap at PostgreSQL's lock boundary rather than
          // assuming Promise.all caused the intended interleaving.
          const deadline = Date.now() + 5000;
          let blocked = false;
          while (Date.now() < deadline) {
            // pg_stat_activity caches a snapshot inside this administrative
            // transaction. Refresh it or a waiter starting after the first
            // sample would remain invisible until the observation times out.
            await sql("select pg_stat_clear_snapshot()");
            const r = await sql(
              `select exists(select 1 from pg_stat_activity where datname=current_database()
              and pid<>pg_backend_pid() and wait_event_type='Lock'
              and query like '%review_entry%') as blocked`,
            );
            if (r.rows[0].blocked) {
              blocked = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          assert(
            blocked,
            "Authenticated review must reach the held database lock",
          );
          await sql(
            "update comun_org_private.reviewer_authorizations set revoked_at=now() where id=$1",
            [authority],
          );
          await sql("commit");
        } catch (error) {
          await sql("rollback");
          throw error;
        } finally {
          // Drain the HTTP operation even if overlap observation failed; never
          // drop its schema with an unobserved request still in flight.
          if (pending) {
            response = await pending;
          }
        }
        assert(response.error, "Revoked reviewer must not commit approval");
        const counts = await sql(
          `select (select count(*)::int from comun_org_private.reviews where request_id=$1) as reviews,
          (select count(*)::int from comun_org_private.enrollments where request_id=$1) as enrollments,
          (select count(*)::int from comun_org_private.audit_events where nucleus_id=$2 and event='approved') as approvals`,
          [q, nucleus],
        );
        assert.deepEqual(counts.rows[0], {
          reviews: 0,
          enrollments: 0,
          approvals: 0,
        });
        assert.deepEqual(await rows(b, "requests", "id", { id: q }), []);
        await denied(b, "review_entry", { request: q, decision: "approved" });
        // Revocation does not consume or auto-reject the person's request.
        // A separately authorized independent reviewer can still decide it.
        await allowReview(q, c);
        const enrollment = await rpc(c, "review_entry", {
          request: q,
          decision: "approved",
        });
        assert.equal(
          await rpc(a, "enrollment_active", { e: enrollment }),
          true,
        );
        await rpc(a, "leave_entry", { enrollment, next_state: "left" });
      },
    );
    await check(
      "M7 concurrent reviews/acceptances are atomic and departure never restores powers",
      async () => {
        const nucleus = randomUUID();
        await sql(
          "insert into comun_org_private.nuclei(id,community_id,purpose,rules_version,state) values($1,$2,'Independent synthetic purpose','lab-v1','active')",
          [nucleus, community],
        );
        const q = await rpc(a, "request_entry", {
          nucleus,
          version: NUCLEUS_CONSENT_VERSION,
          digest: NUCLEUS_CONSENT_NOTICE_SHA256,
          affirmative: true,
        });
        await allowReview(q, b);
        await allowReview(q, c);
        // Separate authenticated HTTP requests, not calls serialized by the
        // administrative pg connection. Both reviewers are independently valid.
        const decisions = await Promise.all(
          [b, c].map((who) =>
            who.client.schema("comun_org_private").rpc("review_entry", {
              request: q,
              decision: "approved",
            }),
          ),
        );
        assert.equal(decisions.filter((r) => !r.error).length, 1);
        assert.equal(decisions.filter((r) => r.error).length, 1);
        const enrollment = decisions.find((r) => !r.error).data;
        const counts = await sql(
          `select (select count(*)::int from comun_org_private.reviews where request_id=$1) as reviews,
          (select count(*)::int from comun_org_private.enrollments where request_id=$1) as enrollments,
          (select count(*)::int from comun_org_private.audit_events where nucleus_id=$2 and event='approved') as approvals`,
          [q, nucleus],
        );
        assert.deepEqual(counts.rows[0], {
          reviews: 1,
          enrollments: 1,
          approvals: 1,
        });
        const m = await rpc(b, "offer_mandate", {
          enrollment,
          responsibility: "Synthetic concurrency responsibility",
          ends: new Date(Date.now() + 86_400_000).toISOString(),
        });
        const acceptances = await Promise.all(
          [true, true].map((accept) =>
            a.client.schema("comun_org_private").rpc("respond_mandate", {
              mandate: m,
              accept,
            }),
          ),
        );
        assert.equal(acceptances.filter((r) => !r.error).length, 1);
        assert.equal(acceptances.filter((r) => r.error).length, 1);
        assert.equal(await rpc(a, "mandate_active", { mandate: m }), true);
        assert.equal(
          (
            await sql(
              "select count(*)::int as n from comun_org_private.audit_events where nucleus_id=$1 and event='mandate_active'",
              [nucleus],
            )
          ).rows[0].n,
          1,
        );
        const raced = await rpc(b, "offer_mandate", {
          enrollment,
          responsibility: "Synthetic exit race",
          ends: new Date(Date.now() + 86_400_000).toISOString(),
        });
        const [exit, acceptance] = await Promise.all([
          a.client.schema("comun_org_private").rpc("leave_entry", {
            enrollment,
            next_state: "left",
          }),
          a.client.schema("comun_org_private").rpc("respond_mandate", {
            mandate: raced,
            accept: true,
          }),
        ]);
        assert(
          !exit.error,
          "Voluntary exit must commit even during acceptance",
        );
        // Either serialization order is legitimate. The post-commit access
        // invariant is identical; a historical acceptance is never active power.
        const receipt = (
          await rows(a, "mandates", "id,state", { id: raced })
        )[0];
        assert.equal(receipt.state, acceptance.error ? "offered" : "active");
        assert.equal(await rpc(a, "mandate_active", { mandate: raced }), false);
        assert.equal(await rpc(a, "mandate_active", { mandate: m }), false);
        await denied(a, "respond_mandate", { mandate: m, accept: true });
        await denied(a, "respond_mandate", { mandate: raced, accept: true });
      },
    );
    await check(
      "M7 database metadata: every candidate table FORCE RLS; no generic service-role or client writes",
      async () => {
        const r = await sql(
          "select bool_and(c.relrowsecurity and c.relforcerowsecurity) as rls,count(*)::int as n from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='comun_org_private' and c.relkind='r'",
        );
        assert.equal(r.rows[0].rls, true);
        assert.equal(r.rows[0].n, 10);
        const priv = await sql(
          "select has_schema_privilege('anon','comun_org_private','USAGE') as anon,has_schema_privilege('service_role','comun_org_private','USAGE') as service,has_table_privilege('authenticated','comun_org_private.enrollments','UPDATE') as write",
        );
        assert.deepEqual(priv.rows[0], {
          anon: false,
          service: false,
          write: false,
        });
        const functions =
          await sql(`select bool_and(p.proconfig @> array['search_path=""']) as fixed_path,
          bool_and(not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('service_role',p.oid,'EXECUTE')) as closed
          from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='comun_org_private' and p.prosecdef`);
        assert.deepEqual(functions.rows[0], { fixed_path: true, closed: true });
        assert.equal(
          (
            await sql(
              "select has_function_privilege('authenticated','comun_org_private.subject_enrollment_current(uuid)','EXECUTE') as allowed",
            )
          ).rows[0].allowed,
          false,
        );
      },
    );
  } finally {
    // Private FK-restricted receipts belong only to this isolated candidate DB.
    // Dispose the complete proposed schema after tests so GoTrue can delete A/B/C.
    await sql("drop schema comun_org_private cascade");
    const remaining = await sql(
      "select to_regnamespace('comun_org_private') is null as absent",
    );
    assert(remaining.rows[0].absent);
    await check(
      "M7 candidate schema and private receipts removed from the owned laboratory",
      async () => assert(remaining.rows[0].absent),
    );
    await admin.end();
  }
}
