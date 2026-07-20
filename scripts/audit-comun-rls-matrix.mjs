import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const rootDir = process.cwd();

const classifications = {
  comun_community_memberships: { decision: "owner_read", purpose: "Vínculo e preferências da pessoa na comunidade.", sensitive: "Estado, preferências e datas pessoais.", expected: "Somente a própria pessoa lê; mutações ocorrem no servidor." },
  comun_community_role_assignments: { decision: "owner_read", purpose: "Responsabilidades comunitárias limitadas.", sensitive: "Papel, escopo e concessão.", expected: "Somente membro titular lê papel ativo; escrita server-only." },
  comun_community_work_groups: { decision: "public_read_safe", purpose: "Grupos temporários com objetivo e encerramento.", sensitive: "Sem lista de membros ou notas privadas.", expected: "Leitura pública apenas de grupos ativos/concluídos." },
  comun_community_work_group_tasks: { decision: "public_read_safe", purpose: "Relação com tarefas públicas existentes.", sensitive: "Sem cópia da tarefa.", expected: "Leitura quando o grupo é público." },
  comun_community_work_group_members: { decision: "service_role_only", purpose: "Participação interna em grupos.", sensitive: "Identidade e responsabilidade.", expected: "Sem acesso direto público." },
  comun_community_audit_log: { decision: "service_role_only", purpose: "Auditoria do ciclo do vínculo.", sensitive: "Identidades, transições e metadata privada.", expected: "Sem acesso direto público." },
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
  comun_archive_agents: { decision: "service_role_only", purpose: "Agentes genéricos creditados no acervo.", sensitive: "Contato privado e estado editorial.", expected: "Servidor expõe somente identidade pública sanitizada; sem grants anon/auth." },
  comun_archive_artworks: { decision: "service_role_only", purpose: "Ficha editorial de obras territoriais.", sensitive: "Workflow, localização sensível e notas privadas.", expected: "Servidor expõe apenas obras publicadas e campos públicos selecionados." },
  comun_archive_artwork_credits: { decision: "service_role_only", purpose: "Créditos e papéis de autoria de obras.", sensitive: "Créditos ainda não aprovados.", expected: "Servidor expõe somente créditos vinculados a obras publicadas." },
  comun_archive_artwork_rights: { decision: "service_role_only", purpose: "Direitos granulares de exibição e uso.", sensitive: "Referências de permissão, restrições e notas privadas.", expected: "Exclusivo da moderação; publicação exige autorização explícita." },
  comun_archive_artwork_safety_reviews: { decision: "service_role_only", purpose: "Revisão de segurança e privacidade de obras.", sensitive: "Riscos, localização e parecer editorial.", expected: "Exclusivo da administração." },
  comun_archive_artwork_submissions: { decision: "service_role_only", purpose: "Contribuições de arte ainda não moderadas.", sensitive: "Contato, declarações, fontes e texto bruto.", expected: "Inserção por rota server-side e leitura exclusiva da moderação." },
  comun_archive_storage_uploads: { decision: "service_role_only", purpose: "Sessões locais de upload privado do acervo.", sensitive: "Nome original, object key, expiração e falha técnica.", expected: "Exclusivo do servidor; nenhum grant anon/authenticated." },
  comun_archive_artwork_relations: { decision: "service_role_only", purpose: "Relações de obras com pautas, territórios e acervo.", sensitive: "Estado e justificativa editorial.", expected: "Servidor expõe somente relações públicas aprovadas." },
  comun_archive_artwork_editorial_versions: { decision: "service_role_only", purpose: "Histórico editorial sanitizado de obras.", sensitive: "Identidade editorial e snapshots internos.", expected: "Exclusivo da administração; snapshots sem campos privados." },
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
  comun_archive_identification_campaigns: { decision: "service_role_only", purpose: "Campanhas públicas de identificação fotográfica.", sensitive: "Autorização operacional e estado de lançamento.", expected: "Servidor expõe projeção sanitizada; sem acesso direto anon/authenticated." },
  comun_archive_identification_items: { decision: "service_role_only", purpose: "Fichas sanitizadas da campanha.", sensitive: "Vínculo com item privado e estado editorial.", expected: "Servidor seleciona apenas campos públicos de campanhas abertas." },
  comun_archive_identification_reports: { decision: "service_role_only", purpose: "Denúncias de comentários comunitários.", sensitive: "Identidade e detalhes privados do denunciante.", expected: "Exclusivo da moderação." },
  comun_archive_identification_summaries: { decision: "service_role_only", purpose: "Síntese editorial de identificações.", sensitive: "Base editorial privada e identidade revisora.", expected: "Servidor expõe somente texto publicado sanitizado." },
  comun_archive_identification_editorial_log: { decision: "service_role_only", purpose: "Histórico editorial da campanha.", sensitive: "Ator e metadados operacionais.", expected: "Exclusivo da administração." },
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
  comun_territorial_layers: { decision: "service_role_only", purpose: "Configuração das camadas do mapa.", sensitive: "Filtros e estado editorial.", expected: "Servidor expõe somente camadas públicas ativas." },
  comun_territory_layers: { decision: "service_role_only", purpose: "Vínculos de territórios com camadas.", sensitive: "Estrutura editorial.", expected: "Servidor sanitiza vínculos públicos." },
  comun_recycling_materials: { decision: "service_role_only", purpose: "Catálogo territorial de materiais.", sensitive: "Estado editorial.", expected: "Servidor expõe materiais ativos." },
  comun_recycling_points: { decision: "service_role_only", purpose: "Operação de pontos de reciclagem.", sensitive: "Notas e operador internos.", expected: "Servidor expõe campos públicos moderados." },
  comun_recycling_point_materials: { decision: "service_role_only", purpose: "Aceitação verificada de materiais.", sensitive: "Estado de verificação.", expected: "Servidor expõe somente orientação pública." },
  comun_territorial_organizations: { decision: "service_role_only", purpose: "Cooperativas e coletivos.", sensitive: "Contato e notas privadas.", expected: "Servidor remove contato privado e não cria ranking." },
  comun_territorial_organization_materials: { decision: "service_role_only", purpose: "Materiais de organizações.", sensitive: "Curadoria operacional.", expected: "Servidor sanitiza campos públicos." },
  comun_collection_routes: { decision: "service_role_only", purpose: "Rotas e cobertura aproximada.", sensitive: "Operação não confirmada.", expected: "Servidor não promete horário exato." },
  comun_collection_route_materials: { decision: "service_role_only", purpose: "Materiais por rota.", sensitive: "Curadoria operacional.", expected: "Servidor sanitiza campos públicos." },
  comun_territorial_needs: { decision: "service_role_only", purpose: "Necessidades territoriais.", sensitive: "Responsável e notas internas.", expected: "Servidor expõe necessidades públicas abertas." },
  comun_territorial_need_interests: { decision: "service_role_only", purpose: "Ofertas de ajuda.", sensitive: "Contato e oferta privados.", expected: "Exclusivo da administração." },
  comun_territorial_properties: { decision: "service_role_only", purpose: "Imóveis e áreas de interesse.", sensitive: "Risco e revisão jurídica.", expected: "Servidor expõe apenas resumo revisado." },
  comun_territorial_sources: { decision: "service_role_only", purpose: "Fontes territoriais.", sensitive: "Nota e documento internos.", expected: "Servidor expõe fontes revisadas." },
  comun_territorial_ownership_assertions: { decision: "service_role_only", purpose: "Atribuições de titularidade.", sensitive: "Nota interna e disputa.", expected: "Servidor exige fonte e revisão." },
  comun_territorial_social_use_proposals: { decision: "service_role_only", purpose: "Propostas de uso social.", sensitive: "Bastidor interno.", expected: "Servidor identifica como proposta, não decisão." },
  comun_territorial_contributions: { decision: "service_role_only", purpose: "Contribuições territoriais moderadas.", sensitive: "Contato, detalhes e anexos privados.", expected: "Exclusivo do servidor e administração." },
  comun_observatories: { decision: "service_role_only", purpose: "Configuração dos observatórios.", sensitive: "Objetivo e responsáveis internos.", expected: "Servidor expõe somente observatórios públicos." },
  comun_observatory_methodologies: { decision: "service_role_only", purpose: "Metodologias versionadas.", sensitive: "Notas e aprovação internas.", expected: "Servidor expõe somente metodologia aprovada." },
  comun_observation_form_versions: { decision: "service_role_only", purpose: "Formulários versionados.", sensitive: "Schemas ainda não publicados.", expected: "Servidor valida a versão aprovada." },
  comun_monitored_entities: { decision: "service_role_only", purpose: "Entidades monitoradas comuns.", sensitive: "Metadados privados.", expected: "Servidor seleciona apenas metadados públicos." },
  comun_observations: { decision: "service_role_only", purpose: "Observações comunitárias brutas.", sensitive: "Payload, contato e hash.", expected: "Nunca há leitura pública direta." },
  comun_observation_verification_events: { decision: "service_role_only", purpose: "Trilha de verificação.", sensitive: "Notas, decisões e identidade editorial.", expected: "Exclusivo do servidor/admin." },
  comun_metric_definitions: { decision: "service_role_only", purpose: "Definições seguras de métricas.", sensitive: "Configuração editorial.", expected: "Sem SQL arbitrário; servidor sanitiza." },
  comun_metric_snapshots: { decision: "service_role_only", purpose: "Indicadores por período.", sensitive: "Snapshots internos e em revisão.", expected: "Servidor expõe apenas approved_public." },
  comun_transport_lines: { decision: "service_role_only", purpose: "Linhas de transporte monitoradas.", sensitive: "Estado de curadoria.", expected: "Servidor expõe campos públicos." },
  comun_transport_stops: { decision: "service_role_only", purpose: "Pontos com localização aproximada.", sensitive: "Estado de curadoria.", expected: "Sem posição de observador." },
  comun_observatory_reports: { decision: "service_role_only", purpose: "Relatórios editoriais de período.", sensitive: "Rascunhos e reivindicações.", expected: "Servidor expõe somente publicados." },
  comun_observatory_action_links: { decision: "service_role_only", purpose: "Vínculos revisados com ações.", sensitive: "Decisão editorial.", expected: "Servidor expõe vínculos públicos." },
  comun_observation_campaigns: { decision: "service_role_only", purpose: "Planejamento e estado das campanhas.", sensitive: "Objetivo, coordenação e calendário interno.", expected: "Servidor expõe somente relatório agregado aprovado." },
  comun_observation_sampling_plans: { decision: "service_role_only", purpose: "Plano de amostragem de campanha.", sensitive: "Critérios e notas internas.", expected: "Sem leitura direta pública." },
  comun_observation_sampling_slots: { decision: "service_role_only", purpose: "Turnos de observação.", sensitive: "Instruções e programação da equipe.", expected: "Sem leitura direta pública." },
  comun_observation_campaign_assignments: { decision: "service_role_only", purpose: "Escala privada da equipe.", sensitive: "Participantes, disponibilidade e notas.", expected: "Nunca público." },
  comun_observation_quality_reviews: { decision: "service_role_only", purpose: "Revisão de qualidade separada da cobertura.", sensitive: "Decisão, parecer e identidade de revisor.", expected: "Exclusivo do servidor/admin." },
  comun_observation_campaign_field_diaries: { decision: "service_role_only", purpose: "Diário privado de campo.", sensitive: "Notas operacionais da equipe.", expected: "Nunca público." },
  comun_observation_campaign_reports: { decision: "service_role_only", purpose: "Relatórios editoriais de campanha.", sensitive: "Rascunho, aprovação e claims internos.", expected: "Servidor filtra somente published após campanha concluída." },
  comun_observation_campaign_evidence_links: { decision: "service_role_only", purpose: "Vínculo de campanha com evidência agregada.", sensitive: "Fluxo editorial e ids internos.", expected: "Sem leitura direta pública." },
  comun_observation_campaign_access_grants: { decision: "service_role_only", purpose: "Convites de acesso mínimo ao campo.", sensitive: "Hash de código, validade e escopo de turno.", expected: "Nunca exposto ao navegador ou por leitura direta." },
  comun_observation_campaign_field_sessions: { decision: "service_role_only", purpose: "Sessões curtas e revogáveis de observador.", sensitive: "Hash de sessão, escopo e tempos operacionais.", expected: "Somente helper server-side." },
  comun_observation_field_corrections: { decision: "service_role_only", purpose: "Histórico de correções pendentes.", sensitive: "Payload anterior de observação.", expected: "Nunca público." },
  comun_pauta_modules: { decision: "service_role_only", purpose: "Composição segura de miniaplicativos.", sensitive: "Configuração e estado editorial.", expected: "Servidor expõe somente módulos públicos ativos e campos permitidos." },
  comun_construction_circles: { decision: "service_role_only", purpose: "Rodas de construção por pauta.", sensitive: "Estado de facilitação e configuração interna.", expected: "Servidor expõe somente roda pública aberta ou concluída." },
  comun_construction_circle_rounds: { decision: "service_role_only", purpose: "Rodadas e etapas da roda.", sensitive: "Agenda e transições de facilitação.", expected: "Servidor filtra rodadas públicas." },
  comun_circle_contributions: { decision: "service_role_only", purpose: "Contribuições estruturadas moderadas.", sensitive: "Contato, moderação e autoria interna.", expected: "Nunca leitura direta; página seleciona somente status visível." },
  comun_circle_syntheses: { decision: "service_role_only", purpose: "Sínteses com acordos e divergências.", sensitive: "Rascunhos e revisão editorial.", expected: "Servidor expõe somente sínteses publicadas." },
  comun_circle_synthesis_links: { decision: "service_role_only", purpose: "Vínculos de síntese com decisões.", sensitive: "Confirmação e referência editorial.", expected: "Servidor filtra referências revisadas." },
  comun_pauta_updates: { decision: "service_role_only", purpose: "Atualizações estruturadas de pauta.", sensitive: "Rascunhos, autoria e visibilidade.", expected: "Servidor publica somente atualizações públicas." },
  comun_member_profiles: { decision: "service_role_only", purpose: "Identidade comunitária mínima.", sensitive: "Identidade e preferências de visibilidade.", expected: "Sem perfil de influência ou leitura direta ampla." },
  comun_member_inbox: { decision: "service_role_only", purpose: "Caixa operacional do membro.", sensitive: "Ações, vínculos e estado de leitura pessoais.", expected: "Somente helpers server-side filtrados pelo membro da sessão." },
  comun_pauta_memberships: { decision: "service_role_only", purpose: "Vínculo privado de pessoa e pauta.", sensitive: "Papéis e participação por pauta.", expected: "Exclusivo de helpers server-side." },
  comun_radio_programs: { decision: "service_role_only", purpose: "Programas da radio.", sensitive: "Workflow editorial.", expected: "Servidor expoe apenas publicados." },
  comun_radio_episodes: { decision: "service_role_only", purpose: "Episodios da radio.", sensitive: "Workflow, sensibilidade e relacoes.", expected: "Servidor expoe selecao publicada sanitizada." },
  comun_radio_credits: { decision: "service_role_only", purpose: "Creditos editoriais.", sensitive: "Notas e creditos privados.", expected: "Servidor expoe somente creditos publicos." },
  comun_radio_voice_consents: { decision: "service_role_only", purpose: "Consentimentos granulares de voz.", sensitive: "Identidade, termo e notas privadas.", expected: "Exclusivo da administracao." },
  comun_radio_music_uses: { decision: "service_role_only", purpose: "Direitos de musica usada.", sensitive: "Provas e notas privadas.", expected: "Servidor expoe somente creditos autorizados." },
  comun_radio_safety_reviews: { decision: "service_role_only", purpose: "Revisao de menores e local sensivel.", sensitive: "Riscos e notas privadas.", expected: "Exclusivo da administracao." },
  comun_radio_transcript_versions: { decision: "service_role_only", purpose: "Versoes de transcricao humana.", sensitive: "Rascunhos e trechos retirados.", expected: "Servidor expoe somente versao publicada." },
  comun_radio_episode_chapters: { decision: "service_role_only", purpose: "Capitulos editoriais.", sensitive: "Conteudo ainda em revisao.", expected: "Servidor expoe somente junto de episodio publicado." },
  comun_radio_schedule_entries: { decision: "service_role_only", purpose: "Grade editorial.", sensitive: "Planejamento interno.", expected: "Servidor expoe somente entradas publicadas." },
  comun_radio_contributions: { decision: "service_role_only", purpose: "Contribuicoes moderadas para radio.", sensitive: "Contato e texto pendente.", expected: "Servidor e area autenticada sanitizam a resposta." },
  comun_radio_editorial_versions: { decision: "service_role_only", purpose: "Historico editorial sanitizado.", sensitive: "Identidade editorial.", expected: "Exclusivo da administracao." },
  comun_system_verification_runs: {
    decision: "service_role_only",
    purpose: "Execucoes sanitizadas de verificacao de infraestrutura.",
    sensitive: "Identidade administrativa e resultado operacional.",
    expected: "Sem acesso direto publico; somente servidor e admin.",
  },
  comun_sidewalk_records: {
    decision: "service_role_only",
    purpose: "Registros territoriais publicos de calçada.",
    sensitive: "Notas privadas, coordenadas, origem da contribuição e estado editorial.",
    expected: "Servidor expõe somente registros públicos com campos sanitizados.",
  },
  comun_sidewalk_observations: {
    decision: "service_role_only",
    purpose: "Histórico moderado de continuidade, piora ou resolução próxima a um registro.",
    sensitive: "Vínculo do membro e nota original ainda não revisada.",
    expected: "Sem acesso direto; servidor expõe somente contagens e eventos aprovados.",
  },
  comun_sidewalk_municipal_configs: {
    decision: "service_role_only",
    purpose: "Configuração editorial e cartográfica do município piloto.",
    sensitive: "Limites e responsabilidade ainda podem estar em preparação.",
    expected: "Servidor seleciona apenas configuração ativa e campos públicos.",
  },
  comun_sidewalk_record_photos: {
    decision: "service_role_only",
    purpose: "Vínculo de fotos revisadas a registros de calçada.",
    sensitive: "Original privado, notas de revisão e checklist de privacidade.",
    expected: "Servidor expõe somente derivadas aprovadas e públicas.",
  },
  comun_sidewalk_record_links: {
    decision: "service_role_only",
    purpose: "Vínculos auditáveis entre registros e ações/tarefas/protocolos/resultados/arte/rádio/memória.",
    sensitive: "Ids internos e notas de vínculo.",
    expected: "Servidor expõe somente vínculos de registros públicos.",
  },
  comun_sidewalk_cycle_memories: {
    decision: "service_role_only",
    purpose: "Memória publicada do ciclo de calçadas.",
    sensitive: "Rascunhos e notas internas do ciclo.",
    expected: "Servidor expõe somente memórias publicadas com resumo público.",
  },
  comun_sidewalk_priorities: {
    decision: "service_role_only",
    purpose: "Decisões humanas de priorização de registros de calçada.",
    sensitive: "Critérios, divergências e limitações em revisão.",
    expected: "Servidor expõe somente priorizações aprovadas.",
  },
  comun_sidewalk_record_corrections: {
    decision: "service_role_only",
    purpose: "Histórico de correções solicitadas em registros de calçada.",
    sensitive: "Notas de solicitação e valores anteriores.",
    expected: "Servidor expõe somente correções aprovadas e campos públicos.",
  },
  comun_sidewalk_record_withdrawals: {
    decision: "service_role_only",
    purpose: "Pedidos de retirada de registros de calçada.",
    sensitive: "Motivo privado e identidade do solicitante.",
    expected: "Admin-only; histórico preservado fora das consultas públicas.",
  },
  comun_editorial_operation_items: { decision: "service_role_only", purpose: "Fila operacional editorial transversal.", sensitive: "Estado, prioridade, gate e contexto ainda não publicados.", expected: "Exclusivo do servidor e administração." },
  comun_editorial_operation_assignments: { decision: "service_role_only", purpose: "Atribuições responsáveis por item.", sensitive: "Identidade, papel e histórico operacional.", expected: "Exclusivo do servidor e administração." },
  comun_editorial_operation_events: { decision: "service_role_only", purpose: "Auditoria sanitizada append-only da operação.", sensitive: "Histórico de decisões internas.", expected: "Exclusivo do servidor e administração." },
};

const internalDecisions = new Set(["admin_only", "service_role_only"]);
const allowedDecisions = new Set([
  "public_read_safe",
  "public_insert_safe",
  "admin_only",
  "service_role_only",
  "owner_read",
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
  if (config.decision === "owner_read" && (table.anon_select || !table.authenticated_select)) {
    failures.push(`${table.table_name}: owner_read exige SELECT authenticated e bloqueio anon`);
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
  let output;
  try {
    output = process.platform === "win32"
      ? execFileSync(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            `Get-Content -LiteralPath '${tempFile.replaceAll("'", "''")}' | npx supabase db query --local --output-format json`,
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
            `npx supabase db query --local --output-format json < '${tempFile.replaceAll("'", "'\\''")}'`,
          ],
          {
            cwd: rootDir,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          },
        );
  } catch (error) {
    // The CLI may exit non-zero after already printing a complete SQL result
    // while its analytics client shuts down. Preserve only a parseable query
    // result; otherwise the audit fails explicitly below.
    output = error?.output?.[1] ?? "";
  }
  fs.rmSync(tempFile, { force: true });
  const start = output.indexOf("[") !== -1 && (output.indexOf("[") < output.indexOf("{") || output.indexOf("{") === -1) ? output.indexOf("[") : output.indexOf("{");
  if (start === -1) throw new Error(`saida sem JSON: ${output}`);
  if (output[start] === "[") {
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
      } else if (!inString && char === "[") {
        depth += 1;
      } else if (!inString && char === "]") {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(output.slice(start, index + 1));
        }
      }
    }
    throw new Error(`JSON incompleto: ${output}`);
  }
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
        String(policy.roles).includes("anon"),
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
