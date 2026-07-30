import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

export const expectedCulturalTables = [
  "comun_archive_items",
  "comun_archive_assets",
  "comun_archive_agents",
  "comun_archive_artworks",
  "comun_archive_artwork_credits",
  "comun_archive_artwork_rights",
  "comun_radio_programs",
  "comun_radio_episodes",
  "comun_radio_credits",
  "comun_radio_voice_consents",
  "comun_radio_transcript_versions",
];

export const fixedCulturalAuditSql = `
select jsonb_build_object(
  'schema', jsonb_build_object(
    'expectedTables', ${expectedCulturalTables.length},
    'presentTables', (
      select count(*)::int
      from unnest(array[${expectedCulturalTables.map((table) => `'${table}'`).join(",")}]) expected(name)
      where to_regclass('public.' || expected.name) is not null
    ),
    'rlsDisabled', (
      select count(*)::int
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = any(array[${expectedCulturalTables.map((table) => `'${table}'`).join(",")}])
        and relation.relkind = 'r'
        and not relation.relrowsecurity
    ),
    'dangerousPublicGrants', (
      select count(*)::int
      from information_schema.table_privileges
      where table_schema = 'public'
        and table_name = any(array[${expectedCulturalTables.map((table) => `'${table}'`).join(",")}])
        and grantee in ('anon', 'authenticated')
        and privilege_type <> 'SELECT'
    )
  ),
  'storage', jsonb_build_object(
    'expectedBuckets', 4,
    'presentBuckets', (
      select count(*)::int
      from storage.buckets
      where id in (
        'archive-private-originals',
        'archive-public-derivatives',
        'radio-private-originals',
        'radio-public-audio'
      )
    ),
    'privateBucketsAccidentallyPublic', (
      select count(*)::int
      from storage.buckets
      where id in ('archive-private-originals', 'radio-private-originals')
        and public
    ),
    'knownObjects', (
      select count(*)::int
      from storage.objects
      where bucket_id in (
        'archive-private-originals',
        'archive-public-derivatives',
        'radio-private-originals',
        'radio-public-audio'
      )
    )
  ),
  'privacy', jsonb_build_object(
    'privateAssetsWithPublicUrl', (
      select count(*)::int
      from public.comun_archive_assets
      where bucket_scope = 'private_original'
        and public_url is not null
    ),
    'publicImageAssetsWithoutAltText', (
      select count(*)::int
      from public.comun_archive_assets asset
      join public.comun_archive_items item
        on item.id = asset.archive_item_id
      where asset.bucket_scope = 'public_safe'
        and asset.review_status = 'approved'
        and asset.public_url is not null
        and asset.mime_type like 'image/%'
        and nullif(trim(asset.alt_text), '') is null
        and item.status = 'published'
        and item.visibility = 'public'
    ),
    'orphanAssetRows', (
      select count(*)::int
      from public.comun_archive_assets asset
      left join public.comun_archive_items item on item.id = asset.archive_item_id
      where item.id is null
    )
  ),
  'content', jsonb_build_object(
    'archive', jsonb_build_object(
      'published', (
        select count(*)::int
        from public.comun_archive_items item
        where item.status = 'published'
          and item.visibility = 'public'
          and item.item_type not in (
            'community_radio_program',
            'community_radio_episode',
            'community_radio_clip',
            'territorial_artwork'
          )
      ),
      'potentialRealCandidates', (
        select count(*)::int
        from public.comun_archive_items item
        where item.status = 'published'
          and item.visibility = 'public'
          and item.published_at is not null
          and item.item_type not in (
            'community_radio_program',
            'community_radio_episode',
            'community_radio_clip',
            'territorial_artwork'
          )
          and lower(item.slug) !~ '(^|[-_])(smoke|fixture|test)'
          and nullif(trim(item.source_name), '') is not null
          and nullif(trim(item.credits), '') is not null
          and item.rights_status in (
            'public_domain',
            'permission_granted',
            'licensed'
          )
          and exists (
            select 1
            from public.comun_archive_assets asset
            where asset.archive_item_id = item.id
              and asset.bucket_scope = 'public_safe'
              and asset.review_status = 'approved'
              and asset.public_url is not null
          )
      )
    ),
    'communityRadio', jsonb_build_object(
      'publishedPrograms', (
        select count(*)::int
        from public.comun_radio_programs
        where publication_status = 'published'
      ),
      'publishedEpisodes', (
        select count(*)::int
        from public.comun_radio_episodes
        where publication_status = 'published'
      ),
      'potentialRealCandidates', (
        select count(*)::int
        from public.comun_radio_episodes episode
        join public.comun_archive_items item
          on item.id = episode.archive_item_id
        where episode.publication_status = 'published'
          and episode.published_at is not null
          and episode.transcript_status = 'published'
          and lower(episode.slug_public) !~ '(^|[-_])(smoke|fixture|test)'
          and exists (
            select 1
            from public.comun_archive_assets asset
            where asset.archive_item_id = episode.archive_item_id
              and asset.asset_role = 'radio_public_episode'
              and asset.bucket_scope = 'public_safe'
              and asset.review_status = 'approved'
              and asset.public_url is not null
          )
          and exists (
            select 1 from public.comun_radio_credits credit
            where credit.episode_item_id = episode.archive_item_id
              and credit.public_visibility = 'public'
          )
          and exists (
            select 1 from public.comun_radio_voice_consents consent
            where consent.episode_item_id = episode.archive_item_id
              and consent.consent_status = 'approved'
              and consent.allow_comun_audio
          )
          and (
            episode.pauta_id is not null
            or episode.territory_id is not null
            or nullif(trim(episode.description_public), '') is not null
          )
      )
    ),
    'territorialArt', jsonb_build_object(
      'published', (
        select count(*)::int
        from public.comun_archive_artworks
        where publication_status = 'published'
      ),
      'potentialRealCandidates', (
        select count(*)::int
        from public.comun_archive_artworks artwork
        join public.comun_archive_items item
          on item.id = artwork.archive_item_id
        join public.comun_archive_artwork_rights rights
          on rights.archive_item_id = artwork.archive_item_id
        where artwork.publication_status = 'published'
          and item.status = 'published'
          and item.visibility = 'public'
          and lower(item.slug) !~ '(^|[-_])(smoke|fixture|test)'
          and nullif(trim(artwork.context_public), '') is not null
          and (
            artwork.territory_id is not null
            or nullif(trim(artwork.territory_absence_reason), '') is not null
          )
          and rights.allow_comun_display
          and rights.consent_status in ('granted', 'partially_granted')
          and exists (
            select 1
            from public.comun_archive_artwork_credits credit
            where credit.archive_item_id = artwork.archive_item_id
              and credit.public_visibility = 'public'
          )
          and exists (
            select 1
            from public.comun_archive_assets asset
            where asset.archive_item_id = artwork.archive_item_id
              and asset.asset_role in (
                'artwork_public_detail',
                'artwork_public_card'
              )
              and asset.bucket_scope = 'public_safe'
              and asset.review_status = 'approved'
              and asset.public_url is not null
              and nullif(trim(asset.alt_text), '') is not null
          )
      )
    )
  )
) as metrics
`;

const forbiddenWriteSql =
  /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|analyze|refresh|reindex|cluster)\b/i;

export function assertCulturalAuditReadOnly(sql = fixedCulturalAuditSql) {
  if (forbiddenWriteSql.test(sql))
    throw new Error("COMUN_CULTURAL_AUDIT_WRITE_BLOCKED");
  if (!/^\s*select\b/i.test(sql))
    throw new Error("COMUN_CULTURAL_AUDIT_SELECT_REQUIRED");
  return true;
}

export function resolveCulturalDatabaseUrl(environment = process.env) {
  return (
    environment.COMUN_CULTURAL_DATABASE_URL ??
    environment.SUPABASE_DB_URL ??
    environment.PR23_DATABASE_URL ??
    ""
  );
}

export function validateCulturalDatabaseTarget(environment = process.env) {
  const databaseUrl = resolveCulturalDatabaseUrl(environment);
  const projectRef = String(environment.SUPABASE_PROJECT_REF ?? "").trim();
  const allowed = String(
    environment.COMUN_CULTURAL_ALLOWED_PROJECT_REFS ??
      environment.PR23_ALLOWED_PROJECT_REFS ??
      "",
  )
    .split(/[\s,]+/)
    .filter(Boolean);

  if (!databaseUrl) throw new Error("COMUN_CULTURAL_AUDIT_DATABASE_MISSING");
  if (!projectRef || allowed.length !== 1 || allowed[0] !== projectRef) {
    throw new Error("COMUN_CULTURAL_AUDIT_PROJECT_NOT_ALLOWLISTED");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("COMUN_CULTURAL_AUDIT_DATABASE_TARGET_INVALID");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("COMUN_CULTURAL_AUDIT_DATABASE_TARGET_INVALID");
  }

  const hostname = parsed.hostname.toLowerCase();
  const username = decodeURIComponent(parsed.username);
  if (projectRef === "LOCAL_VALIDATION") {
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
      throw new Error("COMUN_CULTURAL_AUDIT_DATABASE_TARGET_MISMATCH");
    }
  } else {
    const directHost = hostname === `db.${projectRef}.supabase.co`;
    const poolerUser = username === `postgres.${projectRef}`;
    if (!directHost && !poolerUser) {
      throw new Error("COMUN_CULTURAL_AUDIT_DATABASE_TARGET_MISMATCH");
    }
  }

  return {
    databaseUrl,
    targetVerified: true,
  };
}

function boundedCount(value) {
  return Math.max(0, Math.min(1_000_000_000, Number(value) || 0));
}

export function sanitizeCulturalMetrics(input) {
  const target = {
    verified: input?.target?.verified === true,
    evidence: "allowlisted_project_ref_matches_database_target",
  };
  const schema = {
    expectedTables:
      input?.schema?.expectedTables == null
        ? expectedCulturalTables.length
        : boundedCount(input.schema.expectedTables),
    presentTables: boundedCount(input?.schema?.presentTables),
    rlsDisabled: boundedCount(input?.schema?.rlsDisabled),
    dangerousPublicGrants: boundedCount(input?.schema?.dangerousPublicGrants),
  };
  const storage = {
    expectedBuckets:
      input?.storage?.expectedBuckets == null
        ? 4
        : boundedCount(input.storage.expectedBuckets),
    presentBuckets: boundedCount(input?.storage?.presentBuckets),
    privateBucketsAccidentallyPublic: boundedCount(
      input?.storage?.privateBucketsAccidentallyPublic,
    ),
    knownObjects: boundedCount(input?.storage?.knownObjects),
  };
  const privacy = {
    privateAssetsWithPublicUrl: boundedCount(
      input?.privacy?.privateAssetsWithPublicUrl,
    ),
    publicImageAssetsWithoutAltText: boundedCount(
      input?.privacy?.publicImageAssetsWithoutAltText,
    ),
    orphanAssetRows: boundedCount(input?.privacy?.orphanAssetRows),
  };
  const content = {
    archive: {
      published: boundedCount(input?.content?.archive?.published),
      potentialRealCandidates: boundedCount(
        input?.content?.archive?.potentialRealCandidates,
      ),
    },
    communityRadio: {
      publishedPrograms: boundedCount(
        input?.content?.communityRadio?.publishedPrograms,
      ),
      publishedEpisodes: boundedCount(
        input?.content?.communityRadio?.publishedEpisodes,
      ),
      potentialRealCandidates: boundedCount(
        input?.content?.communityRadio?.potentialRealCandidates,
      ),
    },
    territorialArt: {
      published: boundedCount(input?.content?.territorialArt?.published),
      potentialRealCandidates: boundedCount(
        input?.content?.territorialArt?.potentialRealCandidates,
      ),
    },
  };
  const structuralFindings =
    (target.verified ? 0 : 1) +
    schema.expectedTables -
    schema.presentTables +
    schema.rlsDisabled +
    schema.dangerousPublicGrants +
    Math.max(0, storage.expectedBuckets - storage.presentBuckets) +
    storage.privateBucketsAccidentallyPublic +
    privacy.privateAssetsWithPublicUrl +
    privacy.orphanAssetRows;
  const allDomainsHavePotentialContent = [
    content.archive.potentialRealCandidates,
    content.communityRadio.potentialRealCandidates,
    content.territorialArt.potentialRealCandidates,
  ].every((count) => count > 0);
  const result =
    structuralFindings > 0
      ? "COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE"
      : "COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL";
  return {
    formatVersion: 1,
    auditType: "archive_radio_art_read_only",
    generatedAt: new Date().toISOString(),
    target,
    schema,
    storage,
    privacy,
    content,
    structuralFindings,
    allDomainsHavePotentialContent,
    realContentAuthorizationProven: false,
    result,
    containsPersonalData: false,
    containsRawText: false,
    containsObjectKeys: false,
    databaseWrites: "none",
    storageWrites: "none",
  };
}

export function assertSanitizedCulturalArtifact(artifact) {
  const serialized = JSON.stringify(artifact);
  const forbidden =
    /(postgres(?:ql)?:\/\/|supabase\.co|service_role|bearer\s+|["']authorization["']\s*:|cookie|object_key|private_notes|signed_url|raw_text|eyJ[a-zA-Z0-9_-]{10,})/i;
  if (forbidden.test(serialized))
    throw new Error("COMUN_CULTURAL_AUDIT_SANITIZATION_FAILED");
  if (
    artifact.containsPersonalData !== false ||
    artifact.containsObjectKeys !== false ||
    artifact.target?.verified !== true ||
    artifact.databaseWrites !== "none" ||
    artifact.storageWrites !== "none"
  ) {
    throw new Error("COMUN_CULTURAL_AUDIT_CONTRACT_INVALID");
  }
  return true;
}

export function renderCulturalAuditMarkdown(artifact) {
  return `# Entregabilidade de memória e cultura

- Resultado: \`${artifact.result}\`
- Auditoria: somente leitura
- Destino remoto allowlisted e compatível com a conexão: ${artifact.target.verified ? "sim" : "não"}
- Tabelas canônicas presentes: ${artifact.schema.presentTables}/${artifact.schema.expectedTables}
- Tabelas sem RLS: ${artifact.schema.rlsDisabled}
- Grants públicos perigosos: ${artifact.schema.dangerousPublicGrants}
- Buckets presentes: ${artifact.storage.presentBuckets}/${artifact.storage.expectedBuckets}
- Originais privados com URL pública: ${artifact.privacy.privateAssetsWithPublicUrl}
- Assets órfãos: ${artifact.privacy.orphanAssetRows}
- Acervo — candidatos potenciais: ${artifact.content.archive.potentialRealCandidates}
- Rádio — candidatos potenciais: ${artifact.content.communityRadio.potentialRealCandidates}
- Arte — candidatos potenciais: ${artifact.content.territorialArt.potentialRealCandidates}
- Autorização editorial de conteúdo real comprovada: não
- Escritas no banco: none
- Escritas no Storage: none

Contagens de candidatos não equivalem a autorização de direitos. A promoção exige evidência editorial real, explícita e separada nos três recortes.
`;
}

async function run() {
  assertCulturalAuditReadOnly();
  const { databaseUrl: connectionString } = validateCulturalDatabaseTarget(
    process.env,
  );
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/comun-cultural-deliverability/audit.json";
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const result = await client.query(fixedCulturalAuditSql);
    const artifact = sanitizeCulturalMetrics({
      ...(result.rows[0]?.metrics ?? {}),
      target: { verified: true },
    });
    assertSanitizedCulturalArtifact(artifact);
    await client.query("rollback");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    await writeFile(
      path.join(path.dirname(output), "audit.md"),
      renderCulturalAuditMarkdown(artifact),
      "utf8",
    );
    process.stdout.write("COMUN_ARCHIVE_RADIO_ART_AUDIT_SANITIZED\n");
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_CULTURAL_AUDIT_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
