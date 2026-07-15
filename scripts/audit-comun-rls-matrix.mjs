import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const rootDir = process.cwd();

const classifications = {
  comun_actions: {
    decision: "public_insert_safe",
    purpose: "Acoes leves de visitante em relatos/pautas.",
    sensitive: "visitor_token e note podem ser operacionais.",
    expected: "Insercao publica limitada por policy; sem leitura publica.",
  },
  comun_admin_audit_log: {
    decision: "admin_only",
    purpose: "Auditoria administrativa.",
    sensitive: "E-mails admin, metadata operacional e eventos internos.",
    expected: "Sem acesso direto publico; leitura somente servidor/admin.",
  },
  comun_admin_notifications: {
    decision: "admin_only",
    purpose: "Notificacoes internas da equipe.",
    sensitive: "Responsaveis, prioridades e operacao interna.",
    expected: "Sem acesso direto publico.",
  },
  comun_admin_profiles: {
    decision: "admin_only",
    purpose: "Perfis reais, papeis e permissoes admin.",
    sensitive: "E-mails, papeis, auth_user_id e notas operacionais.",
    expected: "Sem acesso direto publico.",
  },
  comun_admin_users: {
    decision: "admin_only",
    purpose: "Usuarios admin legados.",
    sensitive: "E-mails, ids de usuario e papeis.",
    expected: "Sem leitura publica; policy bloqueadora legada.",
  },
  comun_communities: {
    decision: "public_read_safe",
    purpose: "Comunidades publicas do COMUN.",
    sensitive: "Sem dado pessoal.",
    expected: "Leitura publica apenas de comunidades ativas.",
  },
  comun_dossiers: {
    decision: "public_read_safe",
    purpose: "Dossies legados publicados.",
    sensitive: "Deve conter apenas conteudo publicado legado.",
    expected: "Leitura publica apenas quando status=published.",
  },
  comun_issues: {
    decision: "public_read_safe",
    purpose: "Pautas/questoes publicas legadas.",
    sensitive: "Sem dado pessoal.",
    expected: "Leitura publica.",
  },
  comun_official_protocols: {
    decision: "service_role_only",
    purpose: "Protocolos oficiais, respostas e operacao de Ouvidoria.",
    sensitive:
      "response_text, internal_notes, numero oficial, prazos e vinculo com relato.",
    expected:
      "Sem acesso direto anon/authenticated; server-side com service_role.",
  },
  comun_pauta_contributions: {
    decision: "service_role_only",
    purpose: "Contribuicoes de pauta com moderacao.",
    sensitive:
      "contact_private, moderator_notes, hashes e texto original de contribuicao.",
    expected:
      "Sem acesso direto anon/authenticated; paginas publicas recebem dados sanitizados via servidor.",
  },
  comun_pauta_dossier_evidence: {
    decision: "service_role_only",
    purpose: "Vinculo interno entre dossie e evidencias.",
    sensitive: "Curadoria interna de evidencias.",
    expected: "Sem acesso direto publico.",
  },
  comun_pauta_dossier_publication_snapshots: {
    decision: "service_role_only",
    purpose: "Snapshots imutaveis de publicacao de dossies.",
    sensitive:
      "Historico de publicacao, rollback/despublicacao e ids internos.",
    expected: "Sem acesso direto publico; paginas publicas leem via servidor.",
  },
  comun_pauta_dossier_reviews: {
    decision: "admin_only",
    purpose: "Revisoes factual/editorial.",
    sensitive: "Identidade de revisores, checklist e notas.",
    expected: "Sem acesso direto publico.",
  },
  comun_pauta_dossiers: {
    decision: "admin_only",
    purpose: "Rascunhos e operacao interna de dossies.",
    sensitive:
      "internal_notes, review_notes_internal, responsaveis, checklist e rascunho.",
    expected: "Sem acesso direto publico.",
  },
  comun_pauta_evidence_items: {
    decision: "public_read_safe",
    purpose: "Evidencias publicas de pauta.",
    sensitive:
      "internal_note existe, mas policy limita a sensitivity=public_safe e status=approved.",
    expected: "Leitura publica apenas de evidencias public_safe aprovadas.",
  },
  comun_pauta_spaces: {
    decision: "public_read_safe",
    purpose: "Pautas publicas organizadas.",
    sensitive:
      "Checklist editorial existe, mas rota publica usa campos seguros.",
    expected: "Leitura publica apenas visibility=public e nao archived.",
  },
  comun_pauta_synthesis_versions: {
    decision: "admin_only",
    purpose: "Historico editorial de sintese de pauta.",
    sensitive: "editor_note e versoes anteriores podem ser bastidores.",
    expected:
      "Sem acesso direto publico; historico exibido apenas no admin via servidor.",
  },
  comun_pauta_tasks: {
    decision: "public_read_safe",
    purpose: "Tarefas publicas de pauta.",
    sensitive:
      "owner_alias e due_at podem ser publicos quando a tarefa e publica.",
    expected:
      "Leitura publica apenas de tarefas nao arquivadas em pautas publicas.",
  },
  comun_public_dossier_features: {
    decision: "service_role_only",
    purpose: "Curadoria manual de destaques publicos.",
    sensitive: "Metadados de curadoria e ids de snapshots.",
    expected: "Sem acesso direto publico; paginas publicas leem via servidor.",
  },
  comun_public_lookup_events: {
    decision: "service_role_only",
    purpose: "Eventos/rate limit de consulta publica.",
    sensitive: "protocol_hash, ip_hash, user_agent_hash e metadata.",
    expected: "Sem acesso direto publico.",
  },
  comun_report_attachments: {
    decision: "service_role_only",
    purpose: "Anexos, paths de storage e curadoria.",
    sensitive:
      "storage_path, public_storage_path, nomes de arquivo e notas de redacao.",
    expected: "Sem acesso direto publico.",
  },
  comun_reports: {
    decision: "public_insert_safe",
    purpose: "Relatos brutos e sanitizados.",
    sensitive:
      "raw_text, private_contact, internal_notes, localizacao e dados de relato.",
    expected: "Insercao publica limitada; leitura publica bloqueada.",
  },
  comun_archive_items: {
    decision: "public_read_safe",
    purpose: "Itens publicados do Acervo Vivo.",
    sensitive:
      "Rascunhos e notas editoriais ficam fora das consultas publicas.",
    expected: "Leitura publica somente de itens publicados e visiveis.",
  },
  comun_archive_assets: {
    decision: "public_read_safe",
    purpose: "Metadados de originais e derivados.",
    sensitive: "Chaves privadas e originais nao podem aparecer publicamente.",
    expected:
      "Leitura publica somente de derivados aprovados de itens publicados.",
  },
  comun_archive_artist_profiles: { decision: "service_role_only", purpose: "Perfis especializados de artistas.", sensitive: "contact_private.", expected: "Servidor sanitiza campos públicos; sem grants anon/auth." },
  comun_archive_music_releases: { decision: "service_role_only", purpose: "Ficha de lançamentos musicais.", sensitive: "Workflow editorial e direitos.", expected: "Servidor sanitiza lançamentos publicados; sem grants anon/auth." },
  comun_archive_music_tracks: { decision: "service_role_only", purpose: "Ficha de faixas sem letra ou áudio.", sensitive: "Conteúdo em revisão.", expected: "Servidor expõe somente faixas de lançamentos publicados." },
  comun_archive_external_links: { decision: "service_role_only", purpose: "Links musicais validados.", sensitive: "Links rejeitados ou não verificados.", expected: "Servidor expõe apenas official/authorized." },
  comun_archive_artist_memberships: { decision: "service_role_only", purpose: "Integrantes e papéis públicos documentados.", sensitive: "Conteúdo ainda não revisado.", expected: "Servidor expõe somente junto de artista publicado." },
  comun_archive_music_rights_reviews: { decision: "service_role_only", purpose: "Revisão de direitos musicais.", sensitive: "permission_reference_private e notes_private.", expected: "Exclusivo da moderação." },
  comun_archive_artist_claims: { decision: "service_role_only", purpose: "Reivindicações de perfil.", sensitive: "Contato e prova de verificação privados.", expected: "Exclusivo da moderação." },
  comun_archive_artist_submissions: { decision: "service_role_only", purpose: "Contribuições musicais pendentes.", sensitive: "Contato, fontes e texto não moderado.", expected: "Exclusivo de rotas server-side e moderação." },
  comun_archive_music_editorial_versions: { decision: "service_role_only", purpose: "Histórico editorial musical sanitizado.", sensitive: "Identidade editorial e snapshots internos.", expected: "Exclusivo da administração; snapshots sem campos privados." },
  comun_archive_link_checks: { decision: "service_role_only", purpose: "Resultados técnicos de verificação de links.", sensitive: "Hostnames finais e erros operacionais sanitizados.", expected: "Exclusivo do servidor e da administração." },
  comun_archive_oral_histories: { decision: "service_role_only", purpose: "Metadados e workflow de entrevistas.", sensitive: "Local privado, resumo interno, embargo e risco.", expected: "Servidor expõe apenas seleção pública sanitizada." },
  comun_archive_oral_history_participants: { decision: "service_role_only", purpose: "Participantes de entrevistas.", sensitive: "Nome privado, contato, responsável e condição de menor.", expected: "Sem acesso direto anon/authenticated." },
  comun_archive_oral_history_consents: { decision: "service_role_only", purpose: "Consentimento granular.", sensitive: "Termo, notas, validade e escolhas individuais.", expected: "Exclusivo da administração." },
  comun_archive_oral_history_transcript_versions: { decision: "service_role_only", purpose: "Versões internas e públicas de transcrição.", sensitive: "Transcrição integral nunca revisada.", expected: "Servidor seleciona somente versão pública aprovada." },
  comun_archive_oral_history_segments: { decision: "service_role_only", purpose: "Trechos e marcações sensíveis.", sensitive: "Dados pessoais, alegações e notas privadas.", expected: "Servidor seleciona somente segmentos approved_public." },
  comun_archive_oral_history_editorial_versions: { decision: "service_role_only", purpose: "Histórico sanitizado de História Oral.", sensitive: "Identidade editorial e workflow interno.", expected: "Admin-only." },
  comun_archive_oral_history_suggestions: { decision: "service_role_only", purpose: "Propostas públicas moderadas.", sensitive: "Contato e texto ainda não revisado.", expected: "Inserção somente por rota server-side." },
  comun_archive_oral_history_withdrawals: { decision: "service_role_only", purpose: "Correção, restrição e retirada.", sensitive: "Contato e motivo privado.", expected: "Admin-only." },
  comun_archive_collections: {
    decision: "public_read_safe",
    purpose: "Colecoes editoriais do Acervo.",
    sensitive: "Rascunhos editoriais.",
    expected: "Leitura publica somente de colecoes publicadas.",
  },
  comun_archive_collection_items: {
    decision: "public_read_safe",
    purpose: "Vinculos entre colecoes e itens.",
    sensitive: "Notas editoriais podem ser internas.",
    expected: "Leitura publica somente de vinculos publicados.",
  },
  comun_archive_relations: {
    decision: "public_read_safe",
    purpose: "Relacoes editoriais entre memorias.",
    sensitive: "internal_note e bastidor editorial.",
    expected:
      "Leitura publica apenas quando ambos os itens sao publicos e sem nota interna.",
  },
  comun_archive_submissions: {
    decision: "service_role_only",
    purpose: "Contribuicoes fotograficas em triagem.",
    sensitive: "Contato privado, procedencia, hashes e moderacao.",
    expected: "Somente rotas server-side e administradores.",
  },
  comun_archive_processing_jobs: {
    decision: "service_role_only",
    purpose: "Fila persistida de derivados.",
    sensitive: "Erros e identificadores operacionais.",
    expected: "Somente servidor/admin.",
  },
  comun_archive_worker_heartbeats: {
    decision: "service_role_only",
    purpose: "Heartbeats do worker.",
    sensitive: "Saude operacional.",
    expected: "Somente servidor/admin.",
  },
  comun_admin_alerts: {
    decision: "service_role_only",
    purpose: "Alertas administrativos.",
    sensitive: "Condicoes operacionais.",
    expected: "Somente servidor/admin.",
  },
  comun_archive_processing_attempts: {
    decision: "service_role_only",
    purpose: "Tentativas e metricas do worker.",
    sensitive: "Metricas operacionais.",
    expected: "Somente servidor/admin.",
  },
  comun_archive_processing_events: {
    decision: "service_role_only",
    purpose: "Eventos sanitizados da fila.",
    sensitive: "Historico operacional.",
    expected: "Somente servidor/admin.",
  },
  comun_archive_submission_assets: {
    decision: "service_role_only",
    purpose: "Vinculo de contribuicao com original privado.",
    sensitive: "Identificadores operacionais de upload.",
    expected: "Sem acesso direto publico.",
  },
  comun_archive_item_suggestions: {
    decision: "service_role_only",
    purpose: "Sugestoes historicas moderadas.",
    sensitive: "Contato privado, texto pendente e risco.",
    expected: "Sem acesso direto publico.",
  },
  comun_archive_rights_removal_requests: {
    decision: "service_role_only",
    purpose: "Pedidos de correcao, credito e retirada.",
    sensitive: "Contato e motivo privados.",
    expected: "Sem acesso direto publico.",
  },
  comun_archive_consent_templates: { decision: "service_role_only", purpose: "Templates versionados de consentimento.", sensitive: "Aprovação, documento e vigência.", expected: "Exclusivo do servidor e administração." },
  comun_archive_consent_legal_reviews: { decision: "service_role_only", purpose: "Revisões qualificadas dos termos.", sensitive: "Responsável, pendências e decisão.", expected: "Exclusivo do servidor e administração." },
  comun_archive_oral_history_consent_sessions: { decision: "service_role_only", purpose: "Sessões de explicação e compreensão.", sensitive: "Perguntas privadas e evidências.", expected: "Exclusivo do servidor e administração." },
  comun_archive_oral_history_interview_plans: { decision: "service_role_only", purpose: "Plano e checklist de campo.", sensitive: "Riscos, fontes, roteiro e bloqueios.", expected: "Exclusivo do servidor e administração." },
  comun_archive_asset_custody_events: { decision: "service_role_only", purpose: "Cadeia de custódia sanitizada.", sensitive: "Operação de originais e backup.", expected: "Exclusivo do servidor e administração." },
  comun_archive_oral_history_transcription_work: { decision: "service_role_only", purpose: "Painel de transcrição manual.", sensitive: "Responsável, pendências e revisões.", expected: "Exclusivo do servidor e administração." },
  comun_archive_oral_history_third_party_statements: { decision: "service_role_only", purpose: "Controle editorial de alegações.", sensitive: "Terceiros, fontes, risco e decisão.", expected: "Exclusivo do servidor e administração." },
  comun_archive_oral_history_participant_approvals: { decision: "service_role_only", purpose: "Aprovação final por superfície.", sensitive: "Mudanças solicitadas e evidências.", expected: "Exclusivo do servidor e administração." },
  comun_hub_territories: { decision: "service_role_only", purpose: "Territórios e notas operacionais.", sensitive: "Notas internas e localização sensível.", expected: "Servidor expõe somente campos públicos selecionados." },
  comun_hub_projects: { decision: "service_role_only", purpose: "Projetos e frentes da organização.", sensitive: "Responsáveis e notas internas.", expected: "Servidor expõe somente campos públicos selecionados." },
  comun_hub_pauta_reports: { decision: "service_role_only", purpose: "Vínculo de relato com pauta central.", sensitive: "Identificadores de relatos brutos.", expected: "Exclusivo do servidor e administração." },
  comun_hub_pauta_projects: { decision: "service_role_only", purpose: "Agrupamento relacional sem duplicar pautas.", sensitive: "Estrutura editorial interna.", expected: "Exclusivo do servidor e administração." },
  comun_mobilization_actions: { decision: "service_role_only", purpose: "Ações organizadas de militância.", sensitive: "Equipe, local e riscos privados.", expected: "Servidor expõe apenas ações públicas e campos aprovados." },
  comun_hub_communication_materials: { decision: "service_role_only", purpose: "Materiais e calendário editorial.", sensitive: "Responsáveis, versões e planejamento.", expected: "Exclusivo do servidor e administração." },
  comun_hub_results: { decision: "service_role_only", purpose: "Resultados e prestação de contas.", sensitive: "Notas e verificação interna.", expected: "Servidor expõe apenas resultados públicos." },
  comun_pauta_timeline_events: { decision: "service_role_only", purpose: "Linha do tempo normalizada da pauta.", sensitive: "Notas internas e fontes restritas.", expected: "Servidor expõe apenas eventos públicos." },
  comun_hub_archive_links: { decision: "service_role_only", purpose: "Relação do Acervo com lutas e territórios.", sensitive: "Nota editorial interna.", expected: "Servidor expõe somente vínculos públicos sanitizados." },
  comun_hub_participation_interests: { decision: "service_role_only", purpose: "Disponibilidade privada de voluntariado.", sensitive: "Contato, disponibilidade e temas pessoais.", expected: "Exclusivo do servidor e administração; nunca listado publicamente." },
  comun_system_verification_runs: {
    decision: "service_role_only",
    purpose: "Execucoes sanitizadas de verificacao de infraestrutura.",
    sensitive: "Identidade administrativa e resultado operacional.",
    expected: "Sem acesso direto publico; somente servidor e admin.",
  },
};

const internalDecisions = new Set(["admin_only", "service_role_only"]);
const allowedDecisions = new Set([
  "public_read_safe",
  "public_insert_safe",
  "admin_only",
  "service_role_only",
  "must_fix",
]);

const tables = queryRows(`
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'select') as anon_select,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'insert') as anon_insert,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'select') as authenticated_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'insert') as authenticated_insert,
  has_table_privilege('service_role', format('%I.%I', n.nspname, c.relname), 'select') as service_role_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
`);

const policies = queryRows(`
select tablename, policyname, roles, cmd, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;
`);

const policiesByTable = new Map();
for (const policy of policies) {
  policiesByTable.set(policy.tablename, [
    ...(policiesByTable.get(policy.tablename) ?? []),
    policy,
  ]);
}

const failures = [];
for (const table of tables) {
  const config = classifications[table.table_name];
  if (!config) {
    failures.push(`${table.table_name}: tabela sem classificacao`);
    continue;
  }
  if (!allowedDecisions.has(config.decision))
    failures.push(`${table.table_name}: decisao invalida ${config.decision}`);
  if (config.decision === "must_fix")
    failures.push(`${table.table_name}: marcado como must_fix`);
  if (
    config.decision !== "public_read_safe" &&
    config.decision !== "public_insert_safe" &&
    !table.rls_enabled
  ) {
    failures.push(
      `${table.table_name}: RLS desabilitado em tabela sensivel/interna`,
    );
  }
  if (internalDecisions.has(config.decision) && table.anon_select)
    failures.push(`${table.table_name}: anon com SELECT em tabela interna`);
  if (internalDecisions.has(config.decision) && table.authenticated_select)
    failures.push(
      `${table.table_name}: authenticated com SELECT em tabela interna`,
    );
  if (
    internalDecisions.has(config.decision) &&
    hasPublicAllowingPolicy(policiesByTable.get(table.table_name) ?? [])
  ) {
    failures.push(
      `${table.table_name}: policy publica permissiva em tabela interna`,
    );
  }
  if (
    config.decision === "public_read_safe" &&
    (!table.anon_select || !table.authenticated_select)
  ) {
    failures.push(
      `${table.table_name}: tabela public_read_safe sem SELECT para anon/authenticated`,
    );
  }
  if (
    config.decision === "public_insert_safe" &&
    (!table.anon_insert || !table.authenticated_insert)
  ) {
    failures.push(
      `${table.table_name}: tabela public_insert_safe sem INSERT para anon/authenticated`,
    );
  }
  if (
    config.decision === "public_insert_safe" &&
    hasPublicSelectPolicy(policiesByTable.get(table.table_name) ?? [])
  ) {
    failures.push(
      `${table.table_name}: tabela public_insert_safe possui SELECT publico`,
    );
  }
}

for (const tableName of Object.keys(classifications)) {
  if (!tables.some((table) => table.table_name === tableName))
    failures.push(`${tableName}: classificacao sem tabela existente`);
}

const markdown = renderMarkdown(tables, policiesByTable, failures);
fs.mkdirSync(path.join(rootDir, "docs"), { recursive: true });
fs.writeFileSync(path.join(rootDir, "docs", "comun-rls-matrix.md"), markdown);

console.log(markdown);
if (failures.length) {
  console.error(`RLS_MATRIX_FAIL: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("RLS_MATRIX_OK");

function queryRows(sql) {
  const tempFile = path.join(
    os.tmpdir(),
    `comun-rls-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`,
  );
  fs.writeFileSync(tempFile, sql);
  const output =
    process.platform === "win32"
      ? execFileSync(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            `Get-Content -LiteralPath '${tempFile.replaceAll("'", "''")}' | npx supabase db query --local`,
          ],
          {
            cwd: rootDir,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          },
        )
      : execFileSync(
          "sh",
          [
            "-c",
            `npx supabase db query --local < '${tempFile.replaceAll("'", "'\\''")}'`,
          ],
          {
            cwd: rootDir,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          },
        );
  fs.rmSync(tempFile, { force: true });
  const start = output.indexOf("{");
  if (start === -1) throw new Error(`saida sem JSON: ${output}`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const char = output[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    } else if (!inString && char === "{") {
      depth += 1;
    } else if (!inString && char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(output.slice(start, index + 1)).rows ?? [];
      }
    }
  }
  throw new Error(`JSON incompleto: ${output}`);
}

function hasPublicAllowingPolicy(policiesForTable) {
  return (
    policiesForTable.some(
      (policy) =>
        String(policy.roles).includes("public") ||
        String(policy.roles).includes("anon") ||
        String(policy.roles).includes("authenticated"),
    ) &&
    policiesForTable.some(
      (policy) =>
        policy.cmd === "SELECT" && policy.qual && policy.qual !== "false",
    )
  );
}

function hasPublicSelectPolicy(policiesForTable) {
  return policiesForTable.some(
    (policy) =>
      policy.cmd === "SELECT" && policy.qual && policy.qual !== "false",
  );
}

function renderMarkdown(rows, policyMap, failures) {
  const lines = [
    "# Matriz RLS do COMUN",
    "",
    "Gerado por `npm run audit:rls-matrix`.",
    "",
    `Status: ${failures.length ? "RLS_MATRIX_FAIL" : "RLS_MATRIX_OK"}`,
    "",
    "| Tabela | Decisao | Finalidade | Sensibilidade | Exposicao esperada | RLS | Grants anon/auth/service | Policies |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const config = classifications[row.table_name];
    const policyText =
      (policyMap.get(row.table_name) ?? [])
        .map((policy) => `${policy.cmd}:${policy.policyname}`)
        .join("<br>") || "-";
    lines.push(
      `| \`${row.table_name}\` | ${config?.decision ?? "SEM CLASSIFICACAO"} | ${escapeCell(config?.purpose ?? "-")} | ${escapeCell(config?.sensitive ?? "-")} | ${escapeCell(config?.expected ?? "-")} | ${row.rls_enabled ? "on" : "off"} | anon S:${yn(row.anon_select)} I:${yn(row.anon_insert)} / auth S:${yn(row.authenticated_select)} I:${yn(row.authenticated_insert)} / service S:${yn(row.service_role_select)} | ${escapeCell(policyText)} |`,
    );
  }
  lines.push("", "## Falhas");
  if (failures.length) {
    for (const failure of failures) lines.push(`- ${failure}`);
  } else {
    lines.push("- Nenhuma falha de matriz.");
  }
  return `${lines.join("\n")}\n`;
}

function yn(value) {
  return value ? "Y" : "N";
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}
