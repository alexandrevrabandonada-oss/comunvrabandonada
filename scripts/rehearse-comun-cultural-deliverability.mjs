import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import pg from "pg";
import {
  resolveCulturalDatabaseUrl,
  validateCulturalDatabaseTarget,
} from "./audit-comun-cultural-deliverability.mjs";

const { Client } = pg;

export const CULTURAL_REHEARSAL_CONFIRMATION =
  "EXECUTAR_ENSAIO_PRIVADO_ARCHIVE_RADIO_ART";

export function resolveCulturalRehearsalDatabaseUrl(environment = process.env) {
  return resolveCulturalDatabaseUrl(environment);
}

export function assertCulturalRehearsalContract(environment = process.env) {
  if (
    environment.COMUN_CULTURAL_REHEARSAL_CONFIRMATION !==
    CULTURAL_REHEARSAL_CONFIRMATION
  ) {
    throw new Error("COMUN_CULTURAL_REHEARSAL_CONFIRMATION_REQUIRED");
  }
  if (!resolveCulturalRehearsalDatabaseUrl(environment))
    throw new Error("COMUN_CULTURAL_REHEARSAL_DATABASE_MISSING");
  validateCulturalDatabaseTarget(environment);
  return true;
}

export function sanitizeCulturalRehearsalResult(input) {
  const domains = ["archive", "communityRadio", "territorialArt"];
  const counts = Object.fromEntries(
    domains.map((domain) => [
      domain,
      Math.max(0, Math.min(10, Number(input?.counts?.[domain]) || 0)),
    ]),
  );
  const green = domains.every((domain) => counts[domain] === 1);
  return {
    formatVersion: 1,
    rehearsalType: "private_transactional_archive_radio_art",
    executedAt: new Date().toISOString(),
    counts,
    privateVisibilityVerified: input?.privateVisibilityVerified === true,
    publicProjectionBlocked: input?.publicProjectionBlocked === true,
    transactionRolledBack: input?.transactionRolledBack === true,
    rowsRemainingAfterRollback: Math.max(
      0,
      Number(input?.rowsRemainingAfterRollback) || 0,
    ),
    storageMetadataRehearsed: input?.storageMetadataRehearsed === true,
    storageObjectLifecycleCoveredLocally: true,
    syntheticDataOnly: true,
    containsIds: false,
    containsPersonalData: false,
    databaseWritesPersisted: "none",
    storageWrites: "none",
    result:
      green &&
      input?.privateVisibilityVerified === true &&
      input?.publicProjectionBlocked === true &&
      input?.transactionRolledBack === true &&
      Number(input?.rowsRemainingAfterRollback) === 0
        ? "COMUN_ARCHIVE_RADIO_ART_PRIVATE_REHEARSAL_GREEN"
        : "COMUN_ARCHIVE_RADIO_ART_PRIVATE_REHEARSAL_BLOCKED",
  };
}

function rehearsalOutputPath(argv = process.argv) {
  const outputIndex = argv.indexOf("--output");
  return outputIndex >= 0
    ? argv[outputIndex + 1]
    : ".ci-artifacts/comun-cultural-deliverability/rehearsal.json";
}

async function persistRehearsalFailure(error, output) {
  const marker = String(error?.message ?? "");
  const safeMarker = /^COMUN_[A-Z0-9_]+$/.test(marker)
    ? marker
    : "COMUN_CULTURAL_REHEARSAL_FAILED";
  const artifact = {
    formatVersion: 1,
    rehearsalType: "private_transactional_archive_radio_art_failure",
    result: safeMarker,
    transactionRolledBack: "attempted",
    rowsRemainingAfterRollback: "unknown",
    containsIds: false,
    containsPersonalData: false,
    databaseWritesPersisted: "none",
    storageWrites: "none",
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(path.dirname(output), "rehearsal.md"),
    `# Ensaio privado de memória e cultura

- Resultado: \`${safeMarker}\`
- Falha fechada: sim
- Escritas persistidas no banco: none
- Escritas no Storage: none
`,
    "utf8",
  );
  return safeMarker;
}

async function run() {
  assertCulturalRehearsalContract();
  const output = rehearsalOutputPath();
  const namespace = `private-cultural-${crypto.randomUUID()}`;
  const client = new Client({
    connectionString: resolveCulturalRehearsalDatabaseUrl(),
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  const ids = [];
  let transactionRolledBack = false;
  try {
    await client.connect();
    await client.query("begin");
    const archive = await client.query(
      `insert into public.comun_archive_items(
        slug,item_type,title,summary,source_name,credits,rights_status,status,visibility
      ) values($1,'photograph','Ensaio privado do acervo','Fixture privada',
        'Fonte sintética','Crédito sintético','permission_granted','review','private')
      returning id`,
      [`${namespace}-archive`],
    );
    const archiveId = archive.rows[0].id;
    ids.push(archiveId);
    await client.query(
      `insert into public.comun_archive_assets(
        archive_item_id,asset_role,bucket_scope,object_key,mime_type,
        alt_text,rights_status,review_status
      ) values
        ($1,'original','private_original',$2,'image/jpeg',null,
          'permission_granted','approved'),
        ($1,'public_version','public_safe',$3,'image/webp',
          'Imagem sintética do ensaio privado','permission_granted','approved')`,
      [
        archiveId,
        `${namespace}/archive/original.jpg`,
        `${namespace}/archive/public.webp`,
      ],
    );

    const program = await client.query(
      `insert into public.comun_archive_items(
        slug,item_type,title,status,visibility
      ) values($1,'community_radio_program','Programa privado','review','private')
      returning id`,
      [`${namespace}-program`],
    );
    const programId = program.rows[0].id;
    ids.push(programId);
    await client.query(
      `insert into public.comun_radio_programs(
        archive_item_id,title_public,slug_public,description_public,
        format_type,status,publication_status
      ) values($1,'Programa privado',$2,'Programa sintético privado',
        'cultural','review','review')`,
      [programId, `${namespace}-program`],
    );
    const episode = await client.query(
      `insert into public.comun_archive_items(
        slug,item_type,title,status,visibility
      ) values($1,'community_radio_episode','Episódio privado','review','private')
      returning id`,
      [`${namespace}-episode`],
    );
    const episodeId = episode.rows[0].id;
    ids.push(episodeId);
    await client.query(
      `insert into public.comun_radio_episodes(
        archive_item_id,program_item_id,title_public,slug_public,summary_public,
        description_public,duration_seconds,publication_status,transcript_status
      ) values($1,$2,'Episódio privado',$3,'Resumo sintético',
        'Contexto sintético privado',30,'editorial_review','published')`,
      [episodeId, programId, `${namespace}-episode`],
    );
    await client.query(
      `insert into public.comun_radio_credits(
        episode_item_id,credit_role,public_credit,public_visibility
      ) values($1,'producer','Crédito sintético','public')`,
      [episodeId],
    );
    await client.query(
      `insert into public.comun_radio_voice_consents(
        episode_item_id,consent_status,allow_private_preservation,
        allow_comun_audio,allow_transcript
      ) values($1,'approved',true,true,true)`,
      [episodeId],
    );
    await client.query(
      `insert into public.comun_radio_transcript_versions(
        episode_item_id,version_number,transcript_type,content,status
      ) values($1,1,'manual_editorial','Transcrição sintética.','published')`,
      [episodeId],
    );
    await client.query(
      `insert into public.comun_archive_assets(
        archive_item_id,asset_role,bucket_scope,object_key,mime_type,
        rights_status,review_status
      ) values
        ($1,'radio_private_original','private_original',$2,'audio/wav',
          'permission_granted','approved'),
        ($1,'radio_public_episode','public_safe',$3,'audio/mpeg',
          'permission_granted','approved')`,
      [
        episodeId,
        `${namespace}/radio/original.wav`,
        `${namespace}/radio/public.mp3`,
      ],
    );

    const art = await client.query(
      `insert into public.comun_archive_items(
        slug,item_type,title,summary,source_name,credits,rights_status,status,visibility
      ) values($1,'territorial_artwork','Obra privada','Fixture privada',
        'Fonte sintética','Crédito sintético','permission_granted','review','private')
      returning id`,
      [`${namespace}-art`],
    );
    const artId = art.rows[0].id;
    ids.push(artId);
    await client.query(
      `insert into public.comun_archive_artworks(
        archive_item_id,artwork_type,title_public,description_public,
        context_public,territory_absence_reason,publication_status
      ) values($1,'drawing','Obra privada','Descrição sintética',
        'Contexto sintético','Ensaio privado sem território real','editorial_review')`,
      [artId],
    );
    await client.query(
      `insert into public.comun_archive_artwork_credits(
        archive_item_id,credit_role,public_credit,public_visibility
      ) values($1,'creator','Crédito sintético','public')`,
      [artId],
    );
    await client.query(
      `insert into public.comun_archive_artwork_rights(
        archive_item_id,consent_status,allow_private_preservation,
        allow_comun_display,required_credit_public
      ) values($1,'granted',true,true,'Crédito sintético')`,
      [artId],
    );
    await client.query(
      `insert into public.comun_archive_assets(
        archive_item_id,asset_role,bucket_scope,object_key,mime_type,
        alt_text,rights_status,review_status
      ) values
        ($1,'artwork_private_original','private_original',$2,'image/png',null,
          'permission_granted','approved'),
        ($1,'artwork_public_detail','public_safe',$3,'image/webp',
          'Obra sintética do ensaio privado','permission_granted','approved')`,
      [artId, `${namespace}/art/original.png`, `${namespace}/art/public.webp`],
    );

    const counts = await client.query(
      `select
        count(*) filter(where item_type = 'photograph')::int as archive,
        count(*) filter(where item_type = 'community_radio_episode')::int
          as "communityRadio",
        count(*) filter(where item_type = 'territorial_artwork')::int
          as "territorialArt",
        bool_and(visibility = 'private') as private
      from public.comun_archive_items
      where id = any($1::uuid[])`,
      [ids],
    );
    await client.query("savepoint before_anon_projection");
    await client.query("set local role anon");
    const publicRows = await client.query(
      `select count(*)::int as count
       from public.comun_archive_items
       where id = any($1::uuid[])`,
      [ids],
    );
    await client.query("rollback to savepoint before_anon_projection");
    await client.query("rollback");
    transactionRolledBack = true;
    const remaining = await client.query(
      `select count(*)::int as count
       from public.comun_archive_items
       where id = any($1::uuid[])`,
      [ids],
    );
    const row = counts.rows[0];
    const artifact = sanitizeCulturalRehearsalResult({
      counts: {
        archive: row.archive,
        communityRadio: row.communityRadio,
        territorialArt: row.territorialArt,
      },
      privateVisibilityVerified: row.private === true,
      publicProjectionBlocked: publicRows.rows[0].count === 0,
      transactionRolledBack,
      rowsRemainingAfterRollback: remaining.rows[0].count,
      storageMetadataRehearsed: true,
    });
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    await writeFile(
      path.join(path.dirname(output), "rehearsal.md"),
      `# Ensaio privado de memória e cultura

- Resultado: \`${artifact.result}\`
- Acervo: ${artifact.counts.archive}
- Rádio: ${artifact.counts.communityRadio}
- Arte: ${artifact.counts.territorialArt}
- Projeção pública bloqueada: ${artifact.publicProjectionBlocked ? "sim" : "não"}
- Transação revertida: ${artifact.transactionRolledBack ? "sim" : "não"}
- Linhas remanescentes: ${artifact.rowsRemainingAfterRollback}
- Escritas persistidas no banco: none
- Escritas no Storage: none
`,
      "utf8",
    );
    process.stdout.write(`${artifact.result}\n`);
  } catch (error) {
    if (!transactionRolledBack) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(async (error) => {
    const safeMarker = await persistRehearsalFailure(
      error,
      rehearsalOutputPath(),
    );
    process.stderr.write(`${safeMarker}\n`);
    process.exitCode = 1;
  });
}
