# Baseline de produção do COMUN

Atualizado em 26 de julho de 2026.

## Baseline vigente

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- `main`: `28f26f2b7c101633e6b68332e0cea003bc4c3af1`;
- PR de fechamento: [#40](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/40);
- RELEASE/FULL do candidato:
  [run 30216249436](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216249436),
  aprovado;
- Vercel Production:
  [READY](https://comunvrabandonada-p0xatd36v-alexandrevrabandonada-oss-projects.vercel.app);
- `/comun/acoes`: HTTP 200 com mensagem pública de preparação;
- `/comun/minha-participacao` e `/comun/admin/acoes`: HTTP 307 controlado para
  autenticação;
- nenhuma resposta 5xx, erro de schema ou log de runtime em nível de erro
  encontrado no smoke;
- decisão: `COMUN_TIJolo_44_3_ACTION_TO_MEMORY_MERGED`;
- `COMUN_COLLECTIVE_ACTIONS_V1`: desabilitada em produção;
- migration remota de Ações Coletivas: não aplicada;
- domínio: inalterado;
- banco remoto, storage e histórico de migrations: sem escrita.

O bloco histórico abaixo registra baselines anteriores à integração do Tijolo
44.3.

## Baseline histórico

Verificação read-only em 23 de julho de 2026, com confirmação de imutabilidade
após a tentativa de promoção de 24 de julho de 2026.

## GitHub

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- PR #23: `MERGED`;
- HEAD promovido: `78ace0a3ec6c4f150abb2039f81a4b6732853045`;
- merge commit: `37371098e8f78b1effc047e18b6f8504b3a58f31`;
- `main` verificada: `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- tag `comun-pr23-unified`: aponta para o merge commit.

## Vercel

- projeto: `comunvrabandonada`;
- deployment de produção: `dpl_FYTwUsW2Lg1ytaRw4sjK85463sfq`;
- commit implantado: `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- estado: `READY`;
- erros críticos de runtime nas últimas 24 horas: nenhum encontrado;
- apex e `www`: vinculados ao projeto canônico;
- `www`: HTTP 308 para `https://comunsocial.online/`.

## Smoke público

| Rota | Resultado |
| --- | --- |
| `/comun` | 200 |
| `/comun/explorar` | 200 |
| `/comun/participar` | 200 |
| `/comun/calcadas` | 200 |
| `/comun/acervo` | 200 |
| `/comun/arte` | 200 após redirecionar para `/comun/acervo/arte` |
| `/comun/radio` | 200 |

O HTML público inspecionado não contém `service_role`, `object_key`,
`exact_latitude` ou `exact_longitude`.

## Cartografia

- arquivo: `/maps/volta-redonda/volta-redonda.pmtiles`;
- resposta parcial: HTTP 206;
- `Content-Range`: `bytes 0-127/10147678`.

Nenhum registro, upload, alteração de banco ou mudança de domínio foi realizado
por esta verificação.

## Baseline de segurança v2

- captura: execução `30043886656`;
- fingerprint: `f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793`;
- Artifact sanitizado: publicado por sete dias;
- resultado: `COMUN_BASELINE_SECURITY_FINDINGS` (12);
- produção pública: continua saudável;
- correção remota: não executada.

## Confirmação após a PR #30

O run de promoção `30104161976` foi interrompido antes do merge por
`SOLO_VERCEL_PREVIEW_CURL_FAILED:/comun:1`. Consequentemente:

- a PR #30 continua aberta e sem merge;
- a `main` continua em
  `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- o deployment de produção acima não foi substituído por esse run;
- domínio e aliases não foram reconciliados novamente;
- smoke público pós-deployment não foi executado, pois não houve deployment.

O banco remoto já contém o hardening canônico aplicado na tentativa anterior,
com fingerprint
`a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`,
zero achados bloqueantes e ledger presente. Isso não equivale à promoção da
aplicação: produção continua no baseline Git/Vercel documentado acima.

## Correção de preview sem impacto em produção

A falha do run `30104161976` foi localizada no escopo passado ao cliente
Vercel, não no deployment de produção nem no banco. A correção usa somente o
deployment imutável de Preview da PR #30, com URL HTTPS completa e validação de
project ID, team ID, SHA, `READY` e target `preview`.

O preflight específico não cria deployment, não acessa Supabase, não altera
aliases e não toca `comunsocial.online`. A `main` e o deployment de produção
registrados neste documento continuam sendo o baseline vigente.

O HEAD técnico `7a86cc8585ae81a8b732346220b30dbaa29f8578` passou FAST,
FULL e Vercel, mas o preflight isolado `30111887097` confirmou
`VERCEL_CLI_AUTH_FAILED` para o secret do Actions. Isso não alterou o baseline
de produção.

Resultado da validação isolada: `NO_GO_VERCEL_PREVIEW_CREDENTIAL`.
