# Mapa atual de módulos e fluxos do COMUN

Atualizado em 26 de julho de 2026.

## Atualização — Tijolo 44.3

O diagnóstico original abaixo permanece como contexto histórico. O domínio de
Ações Coletivas foi integrado posteriormente e substitui a lacuna então
registrada de “ação organizada”.

| Domínio integrado | Estruturas | Rotas | Estado em produção |
|---|---|---|---|
| Ações Coletivas | ações, participações, tarefas, atualizações, encaminhamentos e memória | `/comun/acoes`, `/comun/acoes/[slug]`, `/comun/admin/acoes` | código integrado; gate `COMUN_COLLECTIVE_ACTIONS_V1` fail-closed, sem consulta às tabelas novas enquanto a migration remota estiver ausente |

A jornada administrativa cobre criação, publicação, tarefa, encaminhamento,
protocolo, resposta, conclusão, resultado e memória. A timeline pública é
estruturada e sanitizada; participações e dados internos permanecem privados.
O fechamento verificável está em
`reports/comun-fechamento-tijolo-44-3.md`.

## Diagnóstico histórico

Diagnóstico realizado antes de qualquer migration da Sprint 25, em 14/07/2026.

## Inventário existente

| Domínio | Entidades reutilizáveis | Rotas atuais | Situação |
|---|---|---|---|
| Relatos | `comun_reports`, anexos e view pública sanitizada | `/comun/relatar`, `/comun/acompanhar`, `/comun/admin/relatos` | Maduro; relato já pode apontar para `issue_slug`, mas não para a pauta editorial por UUID. |
| Pautas | `comun_pauta_spaces`, contribuições, tarefas, evidências e sínteses | `/comun/pautas`, `/comun/pautas/[slug]`, `/comun/admin/pautas` | É a entidade central correta. Possui moderação, segurança e dossiê, mas faltam workflow operacional, território, responsável, linha do tempo normalizada, ações e resultados. |
| Pauta legada | `comun_issues` | mesmas URLs por fallback | Duplicação histórica. Deve permanecer apenas para compatibilidade; novos vínculos usam `comun_pauta_spaces`. |
| Evidências | `comun_pauta_evidence_items`, anexos, assets do Acervo | pauta pública/admin | Reutilizável; suporta relato, protocolo e documento, mas ainda não relaciona ações/resultados nem todos os itens do Acervo. |
| Protocolos | `comun_official_protocols` | acompanhamento público e `/comun/admin/protocolos-oficiais` | Ligado ao relato, não diretamente à pauta editorial. Resposta pública já é sanitizada. |
| Dossiês/publicação | `comun_pauta_dossiers`, evidências, revisões, snapshots e destaques | `/comun/dossies`, admin e preview | Maduro e ligado à pauta; não deve ser duplicado. |
| Ações leves | `comun_actions` | interações em relatos/pautas | O nome é enganoso para este sprint: guarda confirmação/apoio de visitante, não ação organizada. Deve ser preservado, sem ampliar sua semântica. |
| Tarefas | `comun_pauta_tasks` | pauta pública/admin | Reutilizável e deve ser ampliada com ação, projeto, habilidade, prioridade, visibilidade, voluntariado e resultado. |
| Territórios | `comun_communities`, campos bairro/local em relatos e Acervo | `/comun/comunidades`, `/comun/c/[slug]` | `communities` são temas editoriais, não territórios consistentes. Falta entidade territorial própria e vínculos normalizados. |
| Projetos | nenhum modelo próprio | nenhuma listagem pública | Lacuna. Não criar cópia de pauta; criar agrupamento relacional. |
| Resultados | status e texto dispersos em protocolos, dossiês e tarefas | nenhuma listagem | Lacuna. Promessa e conquista não são diferenciadas de forma estruturada. |
| Comunicação/calendário | nenhum modelo transversal | nenhuma rota | Lacuna. Publicações e prazos estão dispersos. |
| Acervo | itens, relações, assets, fotos, música e História Oral | `/comun/acervo` e admin | Maduro, seguro e operacional. Deve virar memória/contexto relacionado, não eixo dominante da home. |
| Alertas/métricas | `comun_admin_alerts`, observabilidade e filas | admin | Maduro por módulo; falta agregação orientada a trabalho da organização. |

## Rotas desconectadas ou sem próxima ação clara

- A home coloca Acervo antes de pautas e não apresenta ações, resultados, projetos ou territórios.
- A navegação pública oferece Acervo e Dossiês, mas não Ações, Participar, Territórios ou Projetos.
- A página pública de pauta mostra contribuições/tarefas, porém não organiza problema, afetados, reivindicações, ações, respostas, resultados e memória em uma narrativa única.
- Protocolos partem de relatos, mas a pauta depende de inferência por slug; falta vínculo normalizado.
- O admin inicial é um painel de módulos, não uma sala de organização por prazo, responsável e bloqueio.
- Acervo possui várias rotas administrativas profundas que não devem ocupar a navegação pública principal.

## Entidades duplicadas e decisão

1. `comun_issues` versus `comun_pauta_spaces`: preservar a primeira para URLs/dados legados; consolidar novos fluxos em `comun_pauta_spaces`.
2. `comun_actions` versus ação organizada: preservar `comun_actions` como reação leve; criar `comun_mobilization_actions` para militância, evitando migração destrutiva.
3. `comun_communities` versus território: preservar comunidades temáticas; criar território explícito e vinculável.
4. Timeline JSON em `comun_issues`/dossiês: não apagar; criar timeline normalizada da pauta central para eventos futuros.

## Campos e estruturas reutilizáveis

- Pauta: `slug`, título, resumo, síntese pública, próximo passo, visibilidade, checklist e categoria.
- Relato: protocolo, texto sanitizado, bairro, localização aproximada, risco e consentimento de publicação.
- Evidência: fonte, tipo, sensibilidade, estado, nota pública e nota interna.
- Tarefa: pauta, título, descrição, estado, responsável e prazo.
- Protocolo: órgão, estado, prazo, resposta e resumo público.
- Dossiê: fluxo de revisão e snapshot público imutável.
- Acervo: `comun_archive_relations` e itens publicados, sem duplicar conteúdo binário ou editorial.

## Lacunas do fluxo relato → ação → resultado

Faltam: vínculo UUID relato–pauta; workflow público/interno separado; timeline; ação organizada; tarefas ligadas à ação; materiais; projetos; territórios; calendário; resultado com tipo e verificação; relação pauta/ação/resultado com Acervo; busca global sanitizada; caixa de entrada unificada; e métricas de trabalho pendente.

## Direção aprovada pelo diagnóstico

O fluxo futuro será aditivo e compatível:

`comun_reports → comun_pauta_spaces → comun_pauta_evidence_items → comun_mobilization_actions → comun_pauta_tasks → comun_hub_results → comun_pauta_timeline_events`.

Projetos e territórios se relacionam à pauta sem duplicá-la. Consultas públicas passam por helpers server-side com listas explícitas de campos. Tabelas operacionais ficam com RLS e sem grants para `anon/authenticated`; apenas conteúdo marcado público é exposto pela aplicação.
