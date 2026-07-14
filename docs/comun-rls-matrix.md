# Matriz RLS do COMUN

Gerado por `npm run audit:rls-matrix`.

Status: RLS_MATRIX_OK

| Tabela | Decisao | Finalidade | Sensibilidade | Exposicao esperada | RLS | Grants anon/auth/service | Policies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `comun_actions` | public_insert_safe | Acoes leves de visitante em relatos/pautas. | visitor_token e note podem ser operacionais. | Insercao publica limitada por policy; sem leitura publica. | on | anon S:N I:Y / auth S:N I:Y / service S:Y | INSERT:Visitors can insert lightweight actions |
| `comun_admin_audit_log` | admin_only | Auditoria administrativa. | E-mails admin, metadata operacional e eventos internos. | Sem acesso direto publico; leitura somente servidor/admin. | on | anon S:N I:N / auth S:N I:N / service S:Y | SELECT:Public cannot read admin audit log |
| `comun_admin_notifications` | admin_only | Notificacoes internas da equipe. | Responsaveis, prioridades e operacao interna. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_admin_profiles` | admin_only | Perfis reais, papeis e permissoes admin. | E-mails, papeis, auth_user_id e notas operacionais. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_admin_users` | admin_only | Usuarios admin legados. | E-mails, ids de usuario e papeis. | Sem leitura publica; policy bloqueadora legada. | on | anon S:N I:N / auth S:N I:N / service S:Y | SELECT:Public cannot read admin users |
| `comun_communities` | public_read_safe | Comunidades publicas do COMUN. | Sem dado pessoal. | Leitura publica apenas de comunidades ativas. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read active communities |
| `comun_dossiers` | public_read_safe | Dossies legados publicados. | Deve conter apenas conteudo publicado legado. | Leitura publica apenas quando status=published. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read published dossiers |
| `comun_issues` | public_read_safe | Pautas/questoes publicas legadas. | Sem dado pessoal. | Leitura publica. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read issues |
| `comun_official_protocols` | service_role_only | Protocolos oficiais, respostas e operacao de Ouvidoria. | response_text, internal_notes, numero oficial, prazos e vinculo com relato. | Sem acesso direto anon/authenticated; server-side com service_role. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_contributions` | service_role_only | Contribuicoes de pauta com moderacao. | contact_private, moderator_notes, hashes e texto original de contribuicao. | Sem acesso direto anon/authenticated; paginas publicas recebem dados sanitizados via servidor. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_dossier_evidence` | service_role_only | Vinculo interno entre dossie e evidencias. | Curadoria interna de evidencias. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_dossier_publication_snapshots` | service_role_only | Snapshots imutaveis de publicacao de dossies. | Historico de publicacao, rollback/despublicacao e ids internos. | Sem acesso direto publico; paginas publicas leem via servidor. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_dossier_reviews` | admin_only | Revisoes factual/editorial. | Identidade de revisores, checklist e notas. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_dossiers` | admin_only | Rascunhos e operacao interna de dossies. | internal_notes, review_notes_internal, responsaveis, checklist e rascunho. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_evidence_items` | public_read_safe | Evidencias publicas de pauta. | internal_note existe, mas policy limita a sensitivity=public_safe e status=approved. | Leitura publica apenas de evidencias public_safe aprovadas. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read public safe approved pauta evidence |
| `comun_pauta_spaces` | public_read_safe | Pautas publicas organizadas. | Checklist editorial existe, mas rota publica usa campos seguros. | Leitura publica apenas visibility=public e nao archived. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read public pauta spaces |
| `comun_pauta_synthesis_versions` | admin_only | Historico editorial de sintese de pauta. | editor_note e versoes anteriores podem ser bastidores. | Sem acesso direto publico; historico exibido apenas no admin via servidor. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_pauta_tasks` | public_read_safe | Tarefas publicas de pauta. | owner_alias e due_at podem ser publicos quando a tarefa e publica. | Leitura publica apenas de tarefas nao arquivadas em pautas publicas. | on | anon S:Y I:N / auth S:Y I:N / service S:Y | SELECT:Public can read public pauta tasks |
| `comun_public_dossier_features` | service_role_only | Curadoria manual de destaques publicos. | Metadados de curadoria e ids de snapshots. | Sem acesso direto publico; paginas publicas leem via servidor. | on | anon S:N I:N / auth S:N I:N / service S:Y | - |
| `comun_public_lookup_events` | service_role_only | Eventos/rate limit de consulta publica. | protocol_hash, ip_hash, user_agent_hash e metadata. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | SELECT:Public cannot read lookup events |
| `comun_report_attachments` | service_role_only | Anexos, paths de storage e curadoria. | storage_path, public_storage_path, nomes de arquivo e notas de redacao. | Sem acesso direto publico. | on | anon S:N I:N / auth S:N I:N / service S:Y | INSERT:Public cannot insert report attachments<br>SELECT:Public cannot read report attachments |
| `comun_reports` | public_insert_safe | Relatos brutos e sanitizados. | raw_text, private_contact, internal_notes, localizacao e dados de relato. | Insercao publica limitada; leitura publica bloqueada. | on | anon S:N I:Y / auth S:N I:Y / service S:Y | SELECT:Public cannot read raw reports<br>INSERT:Visitors can insert reports |

## Falhas
- Nenhuma falha de matriz.
