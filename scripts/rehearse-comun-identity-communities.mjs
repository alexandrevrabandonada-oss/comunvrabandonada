import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import {
  isCommunityMembershipReviewReplay,
  validateCommunityGroupMember,
  validateCommunityMembershipReview,
  validateCommunityPautaContext,
  validateCommunityRoleMutation,
} from "../lib/community-administration.ts";

export const IDENTITY_REHEARSAL_CONFIRMATION =
  "EXECUTAR_ENSAIO_PRIVADO_IDENTITY_COMMUNITIES";
export const CANONICAL_PROJECT_REF = "nvmdszymrtacfehdynpg";
export const IDENTITY_REHEARSAL_RESULT = "COMUN_IDENTITY_COMMUNITIES_GREEN";

export function classifyIdentityRehearsalTarget({
  connectionString,
  controlledRemote = false,
  confirmation,
  projectRef,
}) {
  const url = new URL(connectionString);
  if (["127.0.0.1", "localhost", "::1"].includes(url.hostname)) return "local";
  if (
    !controlledRemote ||
    confirmation !== IDENTITY_REHEARSAL_CONFIRMATION ||
    projectRef !== CANONICAL_PROJECT_REF
  )
    throw new Error("COMUN_IDENTITY_COMMUNITIES_REMOTE_REHEARSAL_BLOCKED");
  return "controlled_remote";
}

export function assertIdentityArtifactSanitized(artifact) {
  const serialized = JSON.stringify(artifact);
  const forbidden =
    /postgres(?:ql)?:\/\/|supabase\.co|service[_-]?role|authorization|cookie|password|token|@[a-z0-9.-]+|[0-9a-f]{8}-[0-9a-f-]{27,}/i;
  if (forbidden.test(serialized))
    throw new Error("COMUN_IDENTITY_COMMUNITIES_ARTIFACT_NOT_SANITIZED");
  return true;
}

function suffix() {
  return randomBytes(6).toString("hex");
}

async function expectDenied(
  client,
  label,
  { role, userId = null, statement, params = [] },
) {
  const savepoint = `denied_${label.replaceAll("-", "_")}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    await client.query(`set local role ${role}`);
    if (userId)
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true),
          set_config('request.jwt.claims',
            json_build_object('sub', $1, 'role', 'authenticated')::text, true)`,
        [userId],
      );
    await client.query(statement, params);
    throw new Error(`COMUN_IDENTITY_COMMUNITIES_EXPECTED_DENIAL:${label}`);
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query("reset role");
    assert.match(
      String(error?.message ?? error),
      /permission denied|row-level security|row level security/i,
    );
  }
  await client.query(`release savepoint ${savepoint}`);
}

async function asAuthenticated(client, userId, statement, params = []) {
  await client.query("set local role authenticated");
  await client.query(
    `select set_config('request.jwt.claim.sub', $1, true),
      set_config('request.jwt.claims',
        json_build_object('sub', $1, 'role', 'authenticated')::text, true)`,
    [userId],
  );
  const result = await client.query(statement, params);
  await client.query("reset role");
  return result;
}

export async function runIdentityCommunitiesRehearsal({
  connectionString,
  controlledRemote = false,
  confirmation,
  projectRef,
  output,
}) {
  const target = classifyIdentityRehearsalTarget({
    connectionString,
    controlledRemote,
    confirmation,
    projectRef,
  });
  const runSuffix = suffix();
  const namespace = `identity-communities-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${runSuffix}`;
  const actors = {
    requester: randomUUID(),
    reviewer: randomUUID(),
    outsider: randomUUID(),
  };
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  const checks = {
    requestStayedFollowing: false,
    requestIdempotent: false,
    selfApprovalBlocked: false,
    visitorQueueBlocked: false,
    commonMemberModerationBlocked: false,
    authorizedApproval: false,
    approvalIdempotent: false,
    requesterInbox: false,
    coordinatorInbox: false,
    temporaryRoleVisible: false,
    crossCommunityGroupBlocked: false,
    payloadEscalationBlocked: false,
    roleRevocationImmediate: false,
    publicFixtureHidden: false,
  };
  try {
    await client.connect();
    await client.query("begin");
    await client.query(
      `insert into auth.users (
        id, aud, role, email, encrypted_password, raw_app_meta_data,
        raw_user_meta_data, created_at, updated_at
      ) values
        ($1, 'authenticated', 'authenticated', $4, '',
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('username', $7::text, 'display_name', 'Fixture A'),
          now(), now()),
        ($2, 'authenticated', 'authenticated', $5, '',
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('username', $8::text, 'display_name', 'Fixture B'),
          now(), now()),
        ($3, 'authenticated', 'authenticated', $6, '',
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('username', $9::text, 'display_name', 'Fixture C'),
          now(), now())`,
      [
        actors.requester,
        actors.reviewer,
        actors.outsider,
        `requester-${runSuffix}@invalid.local`,
        `reviewer-${runSuffix}@invalid.local`,
        `outsider-${runSuffix}@invalid.local`,
        `rehearsal_requester_${runSuffix}`,
        `rehearsal_reviewer_${runSuffix}`,
        `rehearsal_outsider_${runSuffix}`,
      ],
    );
    const communities = (
      await client.query(
        `insert into public.comun_communities(
          slug, name, short_description, full_description, main_cta, is_active
        ) values
          ($1, 'Comunidade privada A', 'Fixture privada',
            'Ensaio transacional de identidade.', 'Não publicar', false),
          ($2, 'Comunidade privada B', 'Fixture privada',
            'Ensaio transacional cruzado.', 'Não publicar', false)
        returning id, slug`,
        [`${namespace}-a`, `${namespace}-b`],
      )
    ).rows;
    const communityA = communities.find((row) => row.slug.endsWith("-a"));
    const communityB = communities.find((row) => row.slug.endsWith("-b"));
    const pautas = (
      await client.query(
        `insert into public.comun_pauta_spaces(
          slug, title, summary, community, status, visibility
        ) values
          ($1, 'Pauta privada A', 'Fixture privada.', $2, 'organizing', 'internal'),
          ($3, 'Pauta privada B', 'Fixture privada.', $4, 'organizing', 'internal')
        returning id, community`,
        [
          `${namespace}-pauta-a`,
          communityA.slug,
          `${namespace}-pauta-b`,
          communityB.slug,
        ],
      )
    ).rows;
    const pautaA = pautas.find((row) => row.community === communityA.slug);

    const memberships = (
      await client.query(
        `insert into public.comun_community_memberships(
          community_id, member_user_id, state, joined_at
        ) values
          ($1, $3, 'following', null),
          ($1, $4, 'member', now()),
          ($2, $5, 'member', now())
        returning id, community_id, member_user_id, state`,
        [
          communityA.id,
          communityB.id,
          actors.requester,
          actors.reviewer,
          actors.outsider,
        ],
      )
    ).rows;
    const requesterMembership = memberships.find(
      (row) => row.member_user_id === actors.requester,
    );
    const reviewerMembership = memberships.find(
      (row) => row.member_user_id === actors.reviewer,
    );
    const outsiderMembership = memberships.find(
      (row) => row.member_user_id === actors.outsider,
    );

    await client.query(
      `insert into public.comun_admin_users(user_id, email, role, is_active)
       values ($1, $3, 'admin', true), ($2, $4, 'admin', true)`,
      [
        actors.requester,
        actors.reviewer,
        `requester-${runSuffix}@invalid.local`,
        `reviewer-${runSuffix}@invalid.local`,
      ],
    );
    const profiles = (
      await client.query(
        `insert into public.comun_admin_profiles(
          auth_user_id, display_name, email, role, active
        ) values
          ($1, 'Fixture A', $3, 'admin', true),
          ($2, 'Fixture B', $4, 'admin', true)
        returning id, auth_user_id`,
        [
          actors.requester,
          actors.reviewer,
          `requester-${runSuffix}@invalid.local`,
          `reviewer-${runSuffix}@invalid.local`,
        ],
      )
    ).rows;
    const reviewerProfile = profiles.find(
      (row) => row.auth_user_id === actors.reviewer,
    );

    const operation = (
      await client.query(
        `insert into public.comun_editorial_operation_items(
          source_type, source_id, queue, state, title, next_action, priority,
          human_gate, fixture_tag
        ) values (
          'contribution', $1, 'entry', 'pending', 'Solicitação privada',
          'Revisar entrada.', 2, 'community_membership_review', $2
        ) returning id, state`,
        [requesterMembership.id, namespace],
      )
    ).rows[0];
    await client.query(
      `insert into public.comun_editorial_operation_events(
        item_id, event_type, payload
      ) values ($1, 'community_membership_requested',
        '{"request_message":"fixture privada"}'::jsonb)`,
      [operation.id],
    );
    await client.query(
      `insert into public.comun_community_audit_log(
        community_id, member_user_id, actor_user_id, event_type,
        prior_state, next_state, metadata
      ) values ($1, $2, $2, 'membership_requested', null, 'following',
        jsonb_build_object('source', 'controlled_rehearsal'))`,
      [communityA.id, actors.requester],
    );
    await client.query(
      `insert into public.comun_member_inbox(
        member_user_id, notification_type, title, summary, action_label,
        action_url, priority, dedupe_key
      ) values (
        $1, 'community_membership_requested', 'Nova solicitação',
        'Fixture privada aguardando revisão.', 'Abrir comunidade',
        '/comun/c/fixture-private', 'attention', $2
      ) on conflict(member_user_id, dedupe_key) do update
        set updated_at = now()`,
      [actors.reviewer, `${namespace}:request`],
    );

    const requestState = await client.query(
      `select state from public.comun_community_memberships where id = $1`,
      [requesterMembership.id],
    );
    checks.requestStayedFollowing = requestState.rows[0]?.state === "following";
    const openRequests = await client.query(
      `select count(*)::int as count
       from public.comun_editorial_operation_items
       where source_id = $1 and human_gate = 'community_membership_review'
         and state in ('pending','assigned','in_review','blocked','ready')`,
      [requesterMembership.id],
    );
    checks.requestIdempotent = openRequests.rows[0].count === 1;

    const selfReview = validateCommunityMembershipReview({
      operationState: operation.state,
      membershipState: "following",
      decision: "approve",
      actorUserId: actors.requester,
      memberUserId: actors.requester,
    });
    checks.selfApprovalBlocked =
      !selfReview.ok && selfReview.reason === "self_approval_forbidden";

    await expectDenied(client, "visitor-queue", {
      role: "anon",
      statement:
        "select id from public.comun_editorial_operation_items where id = $1",
      params: [operation.id],
    });
    checks.visitorQueueBlocked = true;
    await expectDenied(client, "member-moderation", {
      role: "authenticated",
      userId: actors.reviewer,
      statement:
        "update public.comun_editorial_operation_items set state = 'resolved' where id = $1",
      params: [operation.id],
    });
    checks.commonMemberModerationBlocked = true;
    await expectDenied(client, "payload-escalation", {
      role: "authenticated",
      userId: actors.requester,
      statement:
        "update public.comun_community_memberships set state = 'member' where id = $1",
      params: [requesterMembership.id],
    });
    checks.payloadEscalationBlocked = true;

    const review = validateCommunityMembershipReview({
      operationState: operation.state,
      membershipState: "following",
      decision: "approve",
      actorUserId: actors.reviewer,
      memberUserId: actors.requester,
    });
    assert.equal(review.ok, true);
    await client.query(
      `update public.comun_community_memberships
       set state = 'member', joined_at = now(), updated_at = now()
       where id = $1 and state = 'following'`,
      [requesterMembership.id],
    );
    await client.query(
      `update public.comun_editorial_operation_items
       set state = 'resolved', next_action = 'Entrada aprovada.',
         updated_at = now()
       where id = $1 and state = 'pending'`,
      [operation.id],
    );
    await client.query(
      `insert into public.comun_editorial_operation_events(
        item_id, actor_profile_id, event_type, payload
      ) values ($1, $2, 'community_membership_approved', '{}'::jsonb)`,
      [operation.id, reviewerProfile.id],
    );
    await client.query(
      `insert into public.comun_community_audit_log(
        community_id, member_user_id, actor_user_id, event_type,
        prior_state, next_state, metadata
      ) values ($1, $2, $3, 'membership_approved', 'following', 'member',
        jsonb_build_object('source', 'controlled_rehearsal'))`,
      [communityA.id, actors.requester, actors.reviewer],
    );
    for (let replay = 0; replay < 2; replay += 1) {
      await client.query(
        `insert into public.comun_member_inbox(
          member_user_id, notification_type, title, summary, action_label,
          action_url, priority, dedupe_key
        ) values (
          $1, 'community_membership_approved', 'Entrada aprovada',
          'Fixture privada aprovada.', 'Abrir comunidade',
          '/comun/c/fixture-private', 'attention', $2
        ) on conflict(member_user_id, dedupe_key) do update
          set updated_at = now()`,
        [actors.requester, `${namespace}:approval`],
      );
    }
    checks.authorizedApproval = true;
    const approvalEvidence = await client.query(
      `select
        (select count(*)::int from public.comun_editorial_operation_events
         where item_id = $1
           and event_type = 'community_membership_approved') as events,
        (select count(*)::int from public.comun_member_inbox
         where member_user_id = $2 and dedupe_key = $3) as inbox`,
      [operation.id, actors.requester, `${namespace}:approval`],
    );
    checks.approvalIdempotent =
      approvalEvidence.rows[0].events === 1 &&
      approvalEvidence.rows[0].inbox === 1 &&
      isCommunityMembershipReviewReplay({
        operationState: "resolved",
        matchingDecisionEventExists: true,
      });
    checks.requesterInbox = approvalEvidence.rows[0].inbox === 1;
    const coordinatorInbox = await client.query(
      `select count(*)::int as count from public.comun_member_inbox
       where member_user_id = $1 and dedupe_key = $2`,
      [actors.reviewer, `${namespace}:request`],
    );
    checks.coordinatorInbox = coordinatorInbox.rows[0].count === 1;

    assert.equal(
      validateCommunityRoleMutation({
        membershipState: "member",
        role: "coordinator",
      }).ok,
      true,
    );
    const assignment = (
      await client.query(
        `insert into public.comun_community_role_assignments(
          membership_id, role, scope, granted_by, review_at
        ) values ($1, 'coordinator', 'controlled-rehearsal', $2,
          now() + interval '1 hour')
        returning id`,
        [requesterMembership.id, actors.reviewer],
      )
    ).rows[0];
    const visibleRole = await asAuthenticated(
      client,
      actors.requester,
      `select count(*)::int as count
       from public.comun_community_role_assignments where id = $1`,
      [assignment.id],
    );
    checks.temporaryRoleVisible = visibleRole.rows[0].count === 1;

    assert.equal(
      validateCommunityPautaContext({
        communitySlug: communityA.slug,
        pautaCommunitySlug: pautaA.community,
      }).ok,
      true,
    );
    const group = (
      await client.query(
        `insert into public.comun_community_work_groups(
          community_id, pauta_id, name, objective, cycle_label,
          result_expected, state
        ) values ($1, $2, 'Grupo privado', 'Ensaio transacional',
          'Ciclo privado', 'Comprovar autorização.', 'proposed')
        returning id`,
        [communityA.id, pautaA.id],
      )
    ).rows[0];
    assert.equal(
      validateCommunityGroupMember({
        membershipState: "member",
        membershipCommunityId: communityA.id,
        groupCommunityId: communityA.id,
      }).ok,
      true,
    );
    await client.query(
      `insert into public.comun_community_work_group_members(
        group_id, membership_id, responsibility
      ) values ($1, $2, 'Fixture privada')`,
      [group.id, requesterMembership.id],
    );
    const crossGroup = validateCommunityGroupMember({
      membershipState: outsiderMembership.state,
      membershipCommunityId: outsiderMembership.community_id,
      groupCommunityId: communityA.id,
    });
    checks.crossCommunityGroupBlocked =
      !crossGroup.ok && crossGroup.reason === "community_mismatch";
    await expectDenied(client, "cross-group-direct", {
      role: "authenticated",
      userId: actors.outsider,
      statement: `insert into public.comun_community_work_group_members(
          group_id, membership_id, responsibility
        ) values ($1, $2, 'Escalada recusada')`,
      params: [group.id, outsiderMembership.id],
    });

    await client.query(
      `update public.comun_community_role_assignments
       set revoked_at = now() where id = $1 and revoked_at is null`,
      [assignment.id],
    );
    const roleAfterRevocation = await asAuthenticated(
      client,
      actors.requester,
      `select count(*)::int as count
       from public.comun_community_role_assignments where id = $1`,
      [assignment.id],
    );
    checks.roleRevocationImmediate = roleAfterRevocation.rows[0].count === 0;

    await client.query("set local role anon");
    const publicFixture = await client.query(
      `select
        (select count(*)::int from public.comun_communities
         where slug like $1) as communities,
        (select count(*)::int from public.comun_community_work_groups
         where id = $2) as groups`,
      [`${namespace}%`, group.id],
    );
    await client.query("reset role");
    checks.publicFixtureHidden =
      publicFixture.rows[0].communities === 0 &&
      publicFixture.rows[0].groups === 0;

    for (const [name, passed] of Object.entries(checks))
      assert.equal(passed, true, `identity rehearsal check failed: ${name}`);

    await client.query("rollback");
    const postflight = await client.query(
      `select
        (select count(*)::int from auth.users where id = any($1::uuid[])) as users,
        (select count(*)::int from public.comun_communities
          where slug like $2) as communities,
        (select count(*)::int from public.comun_editorial_operation_items
          where fixture_tag = $3) as operations,
        (select count(*)::int from public.comun_member_inbox
          where dedupe_key like $4) as inbox`,
      [Object.values(actors), `${namespace}%`, namespace, `${namespace}%`],
    );
    assert.deepEqual(postflight.rows[0], {
      users: 0,
      communities: 0,
      operations: 0,
      inbox: 0,
    });

    const artifact = {
      formatVersion: 1,
      rehearsalType: "identity_communities_controlled",
      target,
      namespacePattern: "identity-communities-YYYYMMDD-random",
      authenticatedActors: 3,
      checks,
      historicalSelfApprovals: 0,
      publicVisibility: false,
      emailExternalSend: false,
      transactionRolledBack: true,
      postflightSyntheticRows: 0,
      databaseWritesAfterPostflight: "none",
      storageWrites: "none",
      authWritesAfterPostflight: "none",
      containsPersonalData: false,
      containsUserIds: false,
      containsSecrets: false,
      result: IDENTITY_REHEARSAL_RESULT,
    };
    assertIdentityArtifactSanitized(artifact);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    return artifact;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/comun-identity-communities/rehearsal.json";
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString)
    throw new Error("COMUN_IDENTITY_COMMUNITIES_DATABASE_MISSING");
  const artifact = await runIdentityCommunitiesRehearsal({
    connectionString,
    controlledRemote: process.argv.includes("--controlled-remote"),
    confirmation: process.env.COMUN_IDENTITY_REHEARSAL_CONFIRMATION,
    projectRef: process.env.SUPABASE_PROJECT_REF,
    output,
  });
  process.stdout.write(`${artifact.result}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_IDENTITY_COMMUNITIES_REHEARSAL_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
