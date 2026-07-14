# Estado COMUN Sprint 16 - metricas de protocolos oficiais

Data: 2026-07-07

## Objetivo

Criar metricas de tempo de resposta/resolucao e agrupamento por pauta/comunidade para preparar futuros Dossies por Pauta.

## Implementado

Painel atualizado:

- `/comun/admin/protocolos-oficiais`

Nova secao:

- `Inteligencia operacional`

Cards:

- tempo medio de resposta;
- tempo medio de resolucao;
- protocolos vencidos;
- aguardando resposta;
- resposta sem resumo publico;
- pauta mais recorrente;
- comunidade mais recorrente;
- canal/agencia com mais pendencias.

Tabelas:

- top pautas por volume;
- top comunidades por volume;
- status por pauta;
- vencidos por pauta;
- respostas por canal/agencia.

## Helpers

Criado helper server-side em `lib/official-protocols.ts` para calcular:

- total por status;
- total por pauta;
- total por comunidade;
- total por canal/agencia;
- quantidade vencida;
- tempo medio ate resposta;
- tempo medio ate resolucao;
- protocolos aguardando resposta;
- protocolos sem numero oficial;
- protocolos com resposta mas sem resumo publico;
- pautas com maior acumulo;
- comunidades com maior acumulo.

As metricas usam os itens admin ja sanitizados pela fila de protocolos oficiais. `response_text` e `internal_notes` seguem convertidos apenas em booleanos.

## Possiveis dossies

Criada secao `Possiveis dossies`.

Criterios iniciais:

- pauta com 3 ou mais protocolos;
- pauta com 2 ou mais vencidos;
- comunidade com 3 ou mais protocolos na mesma pauta;
- resposta oficial insatisfatoria;
- protocolos nao resolvidos acumulados.

Cada item mostra:

- pauta;
- comunidade quando aplicavel;
- quantidade de protocolos;
- vencidos;
- resolvidos;
- nao resolvidos;
- CTA para ver protocolos filtrados.

Nenhum dossie foi criado automaticamente.

## Filtros integrados

Links nas metricas aplicam filtros na lista existente:

- pauta;
- comunidade;
- canal/agencia;
- vencidos;
- aguardando resposta.

Os filtros atuais continuam preservados quando possivel.

## Seguranca

Campos nao exibidos:

- `raw_text`;
- `private_contact`;
- `response_text` completo;
- `internal_notes`;
- signed URLs.

O resumo publico continua sendo o unico texto de resposta exibivel publicamente.

## Documentacao

Atualizados:

- `docs/protocolo-popular.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

Rotina documentada:

1. abrir `/comun/admin/protocolos-oficiais`;
2. olhar vencidos;
3. olhar pautas recorrentes;
4. revisar respostas sem resumo publico;
5. marcar resolvido/nao resolvido;
6. selecionar pautas candidatas a dossie.

## Smokes

Script criado:

- `scripts/smoke-comun-official-protocols-metrics.mjs`

Comando:

- `npm run smoke:official-protocols-metrics`

Status local: passou.

Executados localmente:

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:official-protocol`: passou.
- `npm run smoke:official-protocols-admin`: passou.
- `npm run smoke:official-protocols-metrics`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-gdnahbba2-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocol`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocols-admin`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocols-metrics`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou.

## Riscos restantes

1. Metricas ainda sao leitura operacional simples; nao substituem analise editorial.
2. Tempo medio de resolucao usa `updated_at` quando nao ha timestamp especifico de resolucao.
3. Possiveis dossies sao sinais internos e ainda exigem revisao humana.

## Proximo tijolo recomendado

Criar o primeiro rascunho admin de Dossie por Pauta a partir dos sinais de `Possiveis dossies`, ainda sem publicacao automatica.
