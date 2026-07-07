# Estado COMUN Sprint 15 - painel admin de protocolos oficiais

Data: 2026-07-07

## Objetivo

Criar uma visao administrativa agregada de protocolos oficiais para acompanhar prazos, respostas, resolucao e acumulo por pauta/comunidade.

## Rota admin

Rota criada:

- `/comun/admin/protocolos-oficiais`

Acesso:

- protegido por `requireComunAdmin()`.

Link adicionado ao `AdminShell`:

- `Protocolos oficiais`

## Indicadores

Cards criados:

- total de protocolos oficiais;
- rascunhos;
- enviados pelo usuario;
- aguardando resposta;
- vencidos/atrasados;
- resposta recebida;
- resolvidos;
- nao resolvidos.

## Filtros

Filtros criados:

- status;
- comunidade;
- pauta;
- canal;
- com/sem numero oficial;
- com/sem resposta;
- vencidos;
- periodo.

Ordenacao:

- vencidos primeiro;
- depois aguardando resposta;
- depois resposta recebida;
- depois registros recentes.

## Lista

Cada item mostra:

- protocolo COMUN;
- numero oficial;
- comunidade;
- pauta;
- canal/agencia;
- status;
- data de envio;
- previsao de resposta;
- dias em aberto;
- se ha resposta recebida;
- se ha resumo publico;
- link para abrir relato.

Campos sensiveis nao exibidos:

- `raw_text`;
- `private_contact`;
- `response_text` completo;
- `internal_notes`;
- signed URLs.

## Acoes rapidas

Acoes criadas:

- atualizar status;
- registrar resposta recebida;
- criar/editar resumo publico;
- marcar resolvido;
- marcar nao resolvido;
- arquivar.

Auditoria:

- `official_protocol_status_updated`
- `official_protocol_response_saved`
- `official_protocol_public_summary_updated`
- `official_protocol_resolved`
- `official_protocol_unresolved`
- `official_protocol_archived`

## Prazos

Helper criado para calcular:

- dias desde envio;
- se esta vencido;
- se esta perto do prazo.

Regra atual:

- se `expected_response_at` passou e `status='waiting_response'`, a fila destaca como `Atrasado`.
- status nao e alterado automaticamente.

## Documentacao

Atualizados:

- `docs/protocolo-popular.md`
- `docs/operacao-comun.md`
- `docs/deploy-checklist.md`

## Smokes

Script criado:

- `scripts/smoke-comun-official-protocols-admin.mjs`

Comando:

- `npm run smoke:official-protocols-admin`

Status local: passou.

Executados:

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:official-protocol`: passou.
- `npm run smoke:official-protocols-admin`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-rltf5lubq-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocol`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocols-admin`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou.

## Riscos restantes

1. Teste manual com admin real e canal oficial real ainda precisa ser feito.
2. Link da Ouvidoria municipal ainda pode ser refinado.
3. Ainda nao ha alertas externos; a equipe precisa abrir o painel.

## Proximo tijolo recomendado

Criar metricas de tempo medio de resposta/resolucao e agrupamento por pauta para apoiar dossies.
