# Estado COMUN Sprint 14 - Protocolo Popular assistido

Data: 2026-07-07

## Objetivo

Criar o modulo Protocolo Popular / Ouvidoria assistida para gerar texto seguro para canal oficial, registrar numero de protocolo oficial informado pelo usuario e acompanhar resposta sem o COMUN se passar por orgao publico.

## Migration

Arquivo:

- `supabase/migrations/202607070001_official_protocols.sql`

Tabela criada:

- `comun_official_protocols`

Campos principais:

- vinculo com `comun_reports`;
- protocolo COMUN;
- canal/agencia;
- numero oficial;
- texto gerado;
- status operacional;
- resposta privada;
- resumo publico;
- notas internas.

Regra de seguranca:

- `response_text` e `internal_notes` nao sao publicos por padrao;
- pagina publica usa apenas `public_summary`, status e numero oficial informado.

## Rotas criadas

- `/comun/protocolo-popular`
- `/comun/acompanhar/[protocol]/ouvidoria`

Rotas atualizadas:

- `/comun/acompanhar/[protocol]`
- `/comun/relatar/confirmacao`
- `/comun/seguranca`
- `/comun/admin/relatos/[id]`

## Texto gerado

Helper criado:

- `generateOfficialComplaintText(report)`

Usa somente superficie segura:

- protocolo COMUN;
- comunidade/categoria;
- bairro/local aproximado;
- periodo informado;
- `public_text` quando existir;
- descricao minima a partir de campos seguros quando nao houver `public_text`.

Nao usa:

- `raw_text`;
- `private_contact`;
- `internal_notes`;
- latitude/longitude precisa;
- signed URL ou storage path.

## Acoes publicas

- `createOrUpdateOfficialProtocolDraft`
- `saveOfficialProtocolNumber`
- `saveOfficialProtocolResponse`

Regras:

- nao exigem login publico;
- validam protocolo COMUN;
- reaproveitam rate limit de consulta por protocolo;
- nao listam registros;
- nao expõem dados privados;
- resposta completa fica privada por padrao.

## Acoes admin

- secao `Protocolo oficial` no admin do relato;
- admin pode editar canal, agencia, numero oficial, status, datas, resposta, resumo publico e notas internas;
- auditoria registra eventos de geracao, numero salvo, resposta salva e status atualizado.

## Limites do recurso

- COMUN nao e Ouvidoria oficial.
- COMUN nao envia demanda automaticamente.
- COMUN nao promete prazo ou resposta oficial.
- Usuario decide se envia o texto ao canal oficial.
- Protocolo oficial so nasce no canal oficial.

## Seguranca

Confirmado no desenho do patch:

- texto publico nao usa `raw_text`;
- contato privado nao entra no texto;
- notas internas nao entram no texto;
- resposta oficial completa nao aparece publicamente por padrao;
- pagina de seguranca explica os limites do modulo.

## Smokes

Script criado:

- `scripts/smoke-comun-official-protocol.mjs`

Comando:

- `npm run smoke:official-protocol`

Status: passou.

Executado:

- `npm run verify`: passou.
- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.
- `npm run smoke:protocol-follow`: passou.
- `npm run smoke:protocol-rate-limit`: passou.
- `npm run smoke:quick-report`: passou.
- `npm run smoke:attachment-curation`: passou.
- `npm run smoke:attachments-queue`: passou.
- `npm run smoke:attachments-ops`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocol`: passou.

Observacao:

- a primeira versao do smoke oficial tentou criar relato pela chave anon e bateu em RLS;
- o script foi ajustado para montar o registro de teste via service role, mantendo a validacao publica da rota e do nao vazamento.

## Deploy

Status: passou.

Migration remota:

- `202607070001_official_protocols.sql` aplicada no Supabase remoto.

Deploy:

- producao publicada em `https://comunvrabandonada.vercel.app`.
- deploy Vercel: `https://comunvrabandonada-lhhs9c6vu-alexandrevrabandonada-oss-projects.vercel.app`.

Smokes em producao:

- `smoke:no-leak-http`: passou.
- `smoke:public-ui`: passou.
- `smoke:protocol-follow`: passou.
- `smoke:official-protocol`: passou.

## Riscos restantes

1. Teste manual com canal oficial real ainda precisa ser feito.
2. Link da Ouvidoria municipal esta configurado como portal geral da Prefeitura e pode ser refinado para URL oficial mais especifica.
3. Ainda nao ha painel agregado de prazos/respostas de protocolos oficiais.

## Proximo tijolo recomendado

Criar uma visao admin filtrada de protocolos oficiais para acompanhar prazo, resposta e resolucao por pauta.
