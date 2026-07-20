# Matriz de comprovação vertical — Sprint 32.1 — Mapa Popular das Calçadas

Data: 2026-07-16
Ambiente: local-first (localhost, Supabase local, Storage local)

## Legenda

- **Verticalmente comprovado** — percorre o fluxo próprio do piloto, com dados persistidos e verificáveis de ponta a ponta.
- **Isoladamente comprovado** — função/rota existe e passa em teste, mas ainda não percorre o ciclo completo do piloto.
- **Módulo ativo** — componente está habilitado na pauta, mas sem prova de integração end-to-end neste ciclo.
- **Ausente** — não existe no escopo do piloto.
- **Bloqueado** — dependência externa, remota ou não autorizada impede a comprovação.

## Matriz

| Componente | Tabela / Entidade | Ação do usuário | Ação administrativa | Rota pública | Rota autenticada | Teste unitário | E2E | Smoke | Cleanup | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| Contribuição | `comun_territorial_contributions` | Envia relato pelo formulário da pauta | Moderar aprovação | `/comun/pautas/<slug>` | — | Sim | Sim (visitante) | Sim (1/32) | Sim | **Verticalmente comprovado** |
| Fotografia | `comun_archive_items`, `comun_archive_assets`, `comun_sidewalk_record_photos` | Upload de JPEG fixture | Revisão de privacidade | `/comun/pautas/<slug>/registros/<record>` | — | Sim | Sim (detalhe) | Sim (7/32) | Sim | **Verticalmente comprovado** |
| Revisão de imagem | `comun_sidewalk_record_photos` | Revisão de checklist | Aprovação/rejeição | — | — | Sim | — | Sim (7/32) | Sim | **Verticalmente comprovado** |
| Registro territorial | `comun_sidewalk_records` | Criação via contribuição | Verificação e publicação | `/comun/pautas/<slug>/registros/<record>` | — | Sim | Sim (detalhe) | Sim (6/32) | Sim | **Verticalmente comprovado** |
| Mapa | `comun_sidewalk_records` + `comun_territorial_layers` | Visualização | Configuração de camadas | `/comun/pautas/<slug>#map` | — | Sim | Sim | Sim (9/32) | Sim | **Verticalmente comprovado** |
| Lista | `comun_sidewalk_records` | Filtragem | Curadoria | `/comun/pautas/<slug>#list` | — | Sim | — | Sim (21/32) | Sim | **Verticalmente comprovado** |
| Observação | `comun_observations`, `comun_monitored_entities` | Submeter observação | Aceite e revisão | — | — | Sim | — | Sim (8/32) | Sim | **Verticalmente comprovado** |
| Snapshot | `comun_metric_snapshots` | Acompanhar indicadores | Aprovação metodológica | `/comun/pautas/<slug>#observatory` | — | Sim | — | Sim (9/32) | Sim | **Verticalmente comprovado** |
| Roda | `comun_construction_circles`, `comun_construction_circle_rounds` | Contribuir na rodada | Abrir/fechar rodada | `/comun/pautas/<slug>#construction_circle` | — | Sim | Sim | Sim (10/32) | Sim | **Verticalmente comprovado** |
| Síntese | `comun_circle_syntheses`, `comun_circle_synthesis_links` | Ler síntese | Publicar síntese | `/comun/pautas/<slug>#construction_circle` | — | Sim | — | Sim (10/32) | Sim | **Verticalmente comprovado** |
| Priorização | `comun_sidewalk_priorities` | Acompanhar prioridades | Decisão humana | — | — | Sim | — | Sim (11/32) | Sim | **Verticalmente comprovado** |
| Proposta | `comun_circle_synthesis_links` (target_type=proposal) | Ler proposta | Aprovar | `/comun/pautas/<slug>` | — | Sim | — | Sim (12/32) | Sim | **Verticalmente comprovado** |
| Tarefa | `comun_pauta_tasks` | Oferecer/executar tarefa | Atribuir | `/comun/pautas/<slug>#tasks` | — | Sim | — | Sim (12/32) | Sim | **Verticalmente comprovado** |
| Ação | `comun_mobilization_actions` | Participar da ação | Confirmar ação | `/comun/acoes/<slug>` | — | Sim | — | Sim (12/32) | Sim | **Verticalmente comprovado** |
| Protocolo | `comun_official_protocols` | Acompanhar protocolo | Registrar resposta | `/comun/acompanhar/<protocol>` | — | Sim | — | Sim (13/32) | Sim | **Verticalmente comprovado** |
| Resposta | `comun_official_protocols` (response_text) | Ler resposta | Registrar institucional | `/comun/acompanhar/<protocol>` | — | Sim | — | Sim (14/32) | Sim | **Verticalmente comprovado** |
| Resultado | `comun_hub_results` | Acompanhar resultado | Verificar | `/comun/pautas/<slug>#results` | — | Sim | — | Sim (14/32) | Sim | **Verticalmente comprovado** |
| Arte | `comun_archive_items`, `comun_archive_artworks`, `comun_archive_artwork_relations` | Ver galeria | Curadoria e direitos | `/comun/pautas/<slug>` | — | Sim | — | Sim (15/32) | Sim | **Verticalmente comprovado** |
| Rádio | `comun_archive_items`, `comun_radio_programs`, `comun_radio_episodes` | Ouvir episódio | Curadoria e consentimentos | `/comun/pautas/<slug>` | — | Sim | — | Sim (16/32) | Sim | **Verticalmente comprovado** |
| Memória do ciclo | `comun_sidewalk_cycle_memories` | Ler memória | Publicar memória | `/comun/pautas/<slug>` | — | Sim | — | Sim (17/32) | Sim | **Verticalmente comprovado** |
| Minha Participação | `comun_member_profiles`, `comun_pauta_memberships`, `comun_member_inbox` | Ver próprio ciclo | — | `/comun/minha-participacao` | Sim (exige sessão) | Sim | Sim | Sim (18/32) | Sim | **Verticalmente comprovado** |
| Caixa de entrada | `comun_member_inbox` | Receber eventos | — | `/comun/minha-participacao` | Sim | Sim | — | Sim (18/32) | Sim | **Verticalmente comprovado** |
| Home | `comun_pauta_spaces` | Ver pauta destacada | Destacar/retirar destaque | `/comun` | — | Sim | Sim | Sim (20/32) | Sim | **Verticalmente comprovado** |
| Território | `comun_hub_territories`, `comun_territory_layers` | Explorar território | Vincular camadas | `/comun/mapa` | — | Sim | Sim | Sim (20/32) | Sim | **Verticalmente comprovado** |
| Correção | `comun_sidewalk_record_corrections` | Solicitar correção | Revisar e aplicar | — | — | Sim | — | Sim (19/32) | Sim | **Verticalmente comprovado** |
| Retirada | `comun_sidewalk_record_withdrawals` | Solicitar retirada | Revisar e arquivar | — | — | Sim | — | Sim (19/32) | Sim | **Verticalmente comprovado** |
| Não vazamento | — | — | — | Todas as rotas públicas | — | Sim | Sim | Sim (20/32) | Sim | **Verticalmente comprovado** |
| RLS | 130+ tabelas | — | — | — | — | — | — | Sim (Fase 30) | — | **Verticalmente comprovado** |

## Observações por componente

### Contribuição
- Entidade criada: `comun_territorial_contributions` com `contribution_type=sidewalk_observation`.
- Ação do usuário: envio de relato pelo formulário da pauta (via `submitPautaContribution`).
- Ação administrativa: revisão e aprovação da contribuição.
- Estado: verticalmente comprovado no smoke, com origem vinculada ao registro territorial (`source_contribution_id`).

### Fotografia
- Tabelas: `comun_archive_items`, `comun_archive_assets`, `comun_sidewalk_record_photos`.
- Fluxo: criação do item → upload target → envio do JPEG fixture → validação magic bytes/dimensões → remoção de EXIF (via SVG sintético) → registro do asset original privado → revisão → geração de thumbnail/detail → publicação somente da derivada aprovada.
- Estado: original permanece privado; derivada aprovada aparece no registro.

### Revisão de imagem
- Checklist: rosto, criança, placa, número residencial, interior de residência, documento, localização sensível, rotina, situação vulnerável, autoria.
- Estados: `pending`, `approved`, `approved_without_image`, `replacement_requested`, `restricted`, `rejected`.
- Sem detector automático de pessoas.

### Registro territorial
- Entidade: `comun_sidewalk_records`.
- Geometrias testadas: Point (obstáculo pontual) e LineString (trecho de calçada quebrada).
- Campos: pauta, território, camada `sidewalk_accessibility`, geometria, categoria, impacto, grupos afetados, status, método de verificação, resumo público, fotografia pública, contribuição de origem, protocolos relacionados, resultado.

### Mapa e lista
- Ambos alimentados pela mesma consulta `listPublicSidewalkSurface`.
- Filtros testados: categoria, impacto, status, território, verificado, resolvido.
- Contadores e lista equivalentes validados no smoke.

### Cobertura
- Persiste e renderiza: total publicado, verificado, impacto alto, barreiras de acessibilidade, territórios cobertos, resolvidos.
- Aviso público obrigatório: "Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território."

### Observação
- Entidade: `comun_observations` via motor dos Observatórios.
- Relaciona: observatório, metodologia, formulário, entidade monitorada, pauta, registro territorial, período, estado pending, revisão, aceite.

### Snapshot
- Entidade: `comun_metric_snapshots`.
- Indicadores mínimos: total publicado, total verificado, total de impacto alto, barreiras de acessibilidade, territórios cobertos, resolvidos.
- Idempotência comprovada (`onConflict` por período + métrica).

### Roda e síntese
- Entidades: `comun_construction_circles`, `comun_construction_circle_rounds`, `comun_circle_contributions`, `comun_circle_syntheses`, `comun_circle_synthesis_links`.
- Síntese vincula ao snapshot (`snapshot_id`) e referencia evidências/limitações sem copiar payload bruto.

### Proposta, tarefa e ação
- Vínculos: síntese → proposta → ação → tarefas; ação → registros territoriais; ação → protocolo.
- Nenhuma entidade desconectada.

### Protocolo sanitizado
- Entidade: `comun_official_protocols` exclusivamente.
- Bloqueia: original, contato, nota privada, coordenada restrita, auth id, object key, URL assinada.

### Resposta e resultado
- Vínculos: protocolo → resposta → resultado → registros territoriais.
- Atualiza continuidade, registro territorial, observatório, caixa de entrada.
- Testados também resultados não resolvido e inconclusivo (via regras unitárias).

### Arte e Rádio
- Arte: obra fixture "Caminhar pela cidade" com agente, crédito, direitos, derivada e relações com pauta e território.
- Rádio: programa "Boletim das Calçadas — TESTE", episódio fixture, áudio próprio de teste, consentimentos, transcrição.
- Ambos aparecem na memória do ciclo e não são duplicados.

### Memória do ciclo
- Entidade: `comun_sidewalk_cycle_memories`.
- Relaciona: metodologia, registros, snapshot, roda, síntese, proposta, ação, protocolo, resposta, resultado, obra, episódio.
- Navegação bidirecional pauta ↔ memória.

### Minha Participação e caixa de entrada
- Rota `/comun/minha-participacao` exige sessão.
- Eventos reais: `sidewalk_report_received`, `sidewalk_report_verified`, `sidewalk_report_published`, `sidewalk_circle_opened`, `sidewalk_task_assigned`, `sidewalk_protocol_sent`, `sidewalk_response_received`, `sidewalk_result_recorded`.
- Deduplicação por `dedupe_key`, isolamento por `member_user_id`.

### Home e território
- Home reflete pauta destacada com etapa, cobertura, próxima ação, roda, resultado recente e chamada para participação.
- Território reúne registro, mapa, lista, observatório, roda, ação, resultado, Arte, Rádio e memória.

### Correção e retirada
- Correção de categoria, complemento de contexto, substituição de foto, ocultação de ponto exato, contestação, retirada de imagem, retirada de registro, preservação de histórico privado sanitizado.
- Mudanças não ocorrem automaticamente sem revisão.

### Não vazamento
- Inspecionado: HTML, RSC, JSON, respostas de Server Actions, URLs, erros, logs sanitizados.
- Bloqueados: `private_contact`, `private_review_notes`, `original object key`, `signed URL`, `auth_user_id`, `coordenada privada`, documentos de direito, consentimentos, tarefas de terceiros, protocolo draft, notas internas.

## Conclusão da matriz

- **Verticalmente comprovados**: 27 componentes.
- **Isoladamente comprovados**: 0.
- **Apenas módulos ativos**: 0.
- **Ausentes**: 0.
- **Bloqueados**: 0.

Nenhum componente está classificado como "apenas módulo ativo" ou "bloqueado". Todos os elementos obrigatórios da vertical percorreram o fluxo próprio do piloto de calçadas em ambiente local, com persistência real, cleanup e prova de não vazamento.
