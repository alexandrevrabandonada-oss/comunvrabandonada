# Estado COMUN Sprint 17.1 - seguranca de contribuicoes de pauta

Data: 2026-07-07

## Objetivo

Adicionar controle de uso excessivo, triagem de risco e fila global de moderacao para contribuicoes publicas nas pautas sociais.

## Controle de uso excessivo

A action publica `submitPautaContribution` agora usa fingerprint com hash nao reversivel de IP e user-agent.

Regra inicial:

- maximo 5 contribuicoes por hora por hash;
- maximo 20 contribuicoes por dia por hash.

Se exceder, a pessoa recebe:

- `Recebemos muitas contribuicoes em pouco tempo. Tente novamente mais tarde.`

A leitura publica das pautas nao e bloqueada.

## Desafio leve

Formulario publico de pauta passou a incluir:

- honeypot invisivel;
- pergunta simples: `quanto e 2 + 3?`.

Honeypot preenchido ou desafio errado arquiva a contribuicao internamente com risco alto. Nada e publicado automaticamente.

## Triagem de risco

Migration aplicada:

- `supabase/migrations/20260707191614_pauta_contribution_safety.sql`

Campos adicionados em `comun_pauta_contributions`:

- `risk_level`;
- `risk_reasons`;
- `moderation_priority`;
- `submitter_hash`;
- `user_agent_hash`;
- `reviewed_at`;
- `reviewed_by`.

Sinais usados:

- texto curto;
- texto repetido;
- excesso de links;
- termos ofensivos simples;
- muitas contribuicoes recentes;
- honeypot preenchido;
- desafio invalido;
- limite por hora/dia.

Valores:

- `risk_level`: `normal`, `attention`, `high`;
- `moderation_priority`: `normal`, `review_first`, `possible_abuse`.

## Fila global de moderacao

Rota criada:

- `/comun/admin/pautas/contribuicoes`

Acesso:

- `requireComunAdmin()`.

Mostra:

- contribuicoes de todas as pautas;
- pauta relacionada;
- tipo;
- data;
- autor/apelido;
- `risk_level`;
- `risk_reasons`;
- `moderation_priority`;
- trecho do texto;
- acoes rapidas.

Filtros:

- status;
- risco;
- tipo;
- pauta;
- periodo.

AdminShell recebeu link:

- `Contribuicoes`.

## Auditoria

Registrado:

- `pauta_contribution_created`;
- `pauta_contribution_rate_limited`;
- `pauta_contribution_flagged`;
- `pauta_contribution_approved`;
- `pauta_contribution_rejected`;
- `pauta_contribution_archived`.

Metadados sensiveis nao sao registrados em texto aberto.

## Seguranca

Nao aparecem publicamente:

- contribuicoes `pending`;
- contribuicoes `rejected`;
- contribuicoes `archived`;
- contato privado;
- `submitter_hash`;
- `user_agent_hash`;
- `risk_reasons`;
- `raw_text`;
- `private_contact`;
- `internal_notes`;
- `response_text`;
- signed URL;
- `storage_path`.

## Documentacao

Atualizados:

- `docs/pautas-sociais.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`;
- `/comun/seguranca`.

## Smokes locais

Executados:

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:pauta-spaces`: passou.
- `npm run smoke:pauta-contribution-safety`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.

Novo smoke:

- `scripts/smoke-comun-pauta-contribution-safety.mjs`
- `npm run smoke:pauta-contribution-safety`

Cobertura:

- cria pauta teste;
- envia contribuicao valida pelo formulario real;
- confirma `pending`;
- confirma que `pending` nao aparece publicamente;
- aprova contribuicao;
- confirma que aparece publicamente;
- envia contribuicao com desafio invalido/honeypot;
- confirma arquivamento e risco alto;
- simula envios repetidos;
- confirma controle de uso excessivo;
- confirma dados para fila global;
- confirma que hashes/metadados nao aparecem publicamente;
- limpa dados de teste.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-bxp8ntmz1-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-spaces`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-contribution-safety`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou.

## Riscos restantes

1. Lista de termos ofensivos ainda e simples.
2. Nao ha captcha externo, por decisao de manter baixo atrito.
3. Rate limit usa hash de IP quando disponivel; redes compartilhadas podem exigir ajuste fino futuro.
4. A fila global ainda e operacional simples, sem visualizacao por abas.

## Proximo tijolo recomendado

Criar uma camada de qualidade editorial para sinteses de pauta: checklist de publicacao, historico de versoes e marcacao de evidencias que podem virar dossie.
