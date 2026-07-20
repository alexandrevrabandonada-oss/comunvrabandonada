# Estado do COMUN — Sprint 25: Hub Central da Militância

Data: 14/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Resultado

O COMUN foi reposicionado como sistema operacional da organização popular: relato → pauta → evidência → proposta → ação → tarefa → comunicação → protocolo → resultado → memória. A entidade central continua sendo `comun_pauta_spaces`; entidades legadas foram preservadas, sem quebra de URLs. A home e a navegação agora priorizam pautas, ações e participação, deixando o Acervo como memória e contexto.

## Entrega funcional

- Pauta ampliada com estados público e interno, prioridade, urgência, risco, responsáveis, território, problema, pessoas afetadas, demanda, propostas e participação.
- Linha do tempo pública normalizada e vínculos seguros com relatos, protocolos, projetos, resultados e Acervo.
- Ações organizadas, tarefas de militância, materiais de comunicação e prestação de contas.
- Sala de Organização com painel, caixa de entrada unificada, vínculo relato–pauta e calendário.
- Projetos/frentes, territórios, participação privada e busca global apenas em campos públicos.
- Home na ordem operacional: pautas, ações, relato, participação, projetos, resultados, territórios, documentos e Acervo.

## Banco, RLS e privacidade

A migração `20260714235034_comun_central_hub.sql` foi aplicada no Supabase remoto. As dez novas tabelas estão com RLS ativo, sem grants para `anon` ou `authenticated`; o servidor seleciona explicitamente os campos públicos. Contatos, disponibilidade, equipes, riscos, notas internas, relatos brutos e documentos restritos não entram nas consultas públicas. A matriz retornou `RLS_MATRIX_OK` e o lint local/remoto não encontrou erro de schema.

## Fase 0 — regressões congeladas

- Scheduler: quatro execuções recentes `event=schedule`, branch `main`, concluídas com sucesso; run mais recente `29376259109`.
- Supabase: heartbeat mais recente `passed`, origem `scheduler`, duração 3.306 ms, fila vazia, zero retry e zero dead-letter.
- Saúde: `healthy`; zero alerta crítico aberto ligado ao scheduler.
- Cron, secrets, endpoint, fila e autenticação não foram alterados.
- História Oral: zero entrevistas e zero planos reais; gate humano continua fechado.
- Acervo: smoke de fundação aprovado; nenhum módulo foi reconfigurado.

## Verificação

- `npm ci`: aprovado.
- lint, TypeScript e build Next.js 16.2.10: aprovados.
- Vitest: 11 arquivos e 71 testes aprovados.
- Playwright + axe: 44/44 aprovados em 360, 390, 768 e 1366 px; sem overflow e sem violações sérias/críticas.
- Smokes aprovados: Hub central, não vazamento HTTP, autenticação admin, UI pública e fundação do Acervo.
- `npm audit --audit-level=high`: aprovado; permanecem 2 avisos moderados transitivos em PostCSS/Next, sem correção segura não disruptiva disponível.

## Deploy e gate de produção

Deploy Vercel concluído e aliasado em `https://comunvrabandonada.vercel.app` (deployment `comunvrabandonada-783sxb1ad-alexandrevrabandonada-oss-projects.vercel.app`). O build remoto passou com Next.js 16.2.10.

O gate real criou e removeu fixtures descartáveis e confirmou: relato vinculado à pauta, evidência aprovada, proposta, ação, tarefa, material, resposta oficial sanitizada, resultado, relação com o Acervo, linha do tempo, busca e home; nenhum segredo apareceu no HTML. Os smokes de não vazamento, autenticação admin e UI pública também passaram em produção. O cleanup confirmou ausência das fixtures ao final.

## Próximo tijolo recomendado

Operar uma pauta real controlada por uma semana, com responsáveis e critérios de saída, medindo tempo de triagem, tarefas concluídas, resposta institucional e resultado verificável antes de ampliar automações.
