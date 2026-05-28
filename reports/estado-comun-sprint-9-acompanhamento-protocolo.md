# Estado COMUN Sprint 9 - acompanhamento por protocolo

Data: 2026-05-27

## Objetivo

Implementar acompanhamento publico por protocolo de forma segura, limitada e sem expor dados internos do relato.

## Rotas criadas

- [app/comun/acompanhar/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/acompanhar/page.tsx>)
- [app/comun/acompanhar/[protocol]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/acompanhar/[protocol]/page.tsx>)

## Superficie publica criada

Helper principal:

- [lib/reports.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/reports.ts>)

Funcoes adicionadas:

- `normalizeProtocol()`
- `isValidProtocol()`
- `getPublicReportByProtocol()`

Modelo publico novo:

- [lib/types.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/types.ts>)
  - `PublicProtocolReport`
  - `PublicProtocolStatus`

## Campos publicos exibidos

Quando aplicavel, a consulta publica pode retornar:

- `protocol`
- `status`
- `community_slug`
- `issue_slug`
- `title` apenas se ja houver publicacao segura
- `public_text` apenas se publicado
- `period_text`
- `approximate_location`
- `neighborhood`
- `created_at`
- `published_at`
- `public_message`

## Campos bloqueados

Nunca sao retornados nem exibidos:

- `raw_text`
- `private_contact`
- `internal_notes`
- `id` interno
- qualquer dado de admin
- qualquer contato
- qualquer dado de autenticacao

## Comportamento por status

### `received`

Mensagem:

- `Recebido pelo COMUN. A equipe ainda nao revisou.`

### `under_review`

Mensagem:

- `Em analise pela curadoria.`

### `needs_more_info`
- `sanitized`

Mensagem:

- `Seu relato foi recebido e esta em analise. Ele ainda nao foi publicado.`

### `published`

Mensagem:

- `Uma versao sanitizada foi publicada.`

Exibicao adicional:

- `public_text`
- `title`, se presente
- metadados publicos seguros

### `linked_to_issue`

Mensagem:

- `Este relato ajudou a compor uma pauta em acompanhamento.`

### `archived`

Mensagem:

- `Este relato nao esta disponivel para publicacao publica.`

### protocolo inexistente

Mensagem generica:

- `Nao foi possivel localizar um relato publico com esse protocolo.`

### protocolo invalido

Mensagem generica:

- `Digite um protocolo COMUN valido para consultar o andamento publico do relato.`

## Atualizacao da confirmacao

Arquivo alterado:

- [app/comun/relatar/confirmacao/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/page.tsx>)

Mudancas:

- removido o texto de "em breve" sem acao;
- adicionado botao `Acompanhar este relato`;
- link direto para `/comun/acompanhar/[protocol]`;
- `Copiar protocolo` mantido.

## UI publica

Pagina de entrada:

- `/comun/acompanhar`
- titulo `Acompanhar relato`
- campo de protocolo
- botao `Consultar`
- aviso de seguranca sem expor superficie interna

Pagina de resultado:

- protocolo em destaque
- status publico
- comunidade/pauta relacionada, se houver
- data de envio
- data de publicacao, se houver
- `public_text` apenas quando publicado
- links para pauta relacionada, novo relato e seguranca

## Smokes

### Novo smoke

Arquivo criado:

- [scripts/smoke-comun-protocol-follow.mjs](</C:/Projetos/COMUM VR ABANDONADA/scripts/smoke-comun-protocol-follow.mjs>)

Cobertura:

1. insere relato de teste com protocolo
2. consulta `/comun/acompanhar/[protocol]`
3. valida status inicial seguro
4. garante ausencia de `raw_text`, `private_contact` e `internal_notes`
5. publica `public_text` sanitizado
6. consulta novamente a mesma rota
7. valida exibicao da versao publica sanitizada
8. limpa o relato de teste

### Smoke publico de UI atualizado

Arquivo alterado:

- [scripts/smoke-comun-public-ui.mjs](</C:/Projetos/COMUM VR ABANDONADA/scripts/smoke-comun-public-ui.mjs>)

Novos checks:

- `/comun/acompanhar` existe
- texto `Acompanhar relato` aparece
- confirmacao com protocolo mostra `Acompanhar este relato`

## Resultado dos testes locais

Comandos rodados:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run smoke:comun`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:admin-auth`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:no-leak-http`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:public-ui`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:protocol-follow`

Resultado:

- `lint`: passou
- `typecheck`: passou
- `verify`: passou
- `smoke:comun`: passou
- `smoke:admin-auth`: passou
- `smoke:no-leak-http`: passou
- `smoke:public-ui`: passou
- `smoke:protocol-follow`: passou

Observacao:

- houve uma falha transitoria em um `next build` isolado por rename em `.next` no Windows;
- o `verify` subsequente executou `build` com sucesso;
- o problema observado foi de cache/arquivo temporario, nao de codigo funcional.

## Status do deploy

Deploy feito: sim

Comando:

```bash
npx vercel deploy --prod --yes
```

URL publica:

- [https://comunvrabandonada.vercel.app](https://comunvrabandonada.vercel.app)

## Resultado dos testes em producao

Comandos rodados com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`:

- `npm run smoke:protocol-follow`
- `npm run smoke:no-leak-http`
- `npm run smoke:public-ui`

Resultado:

- `smoke:protocol-follow`: passou
- `smoke:no-leak-http`: passou
- `smoke:public-ui`: passou

Checagens HTTP diretas:

- `/comun/acompanhar`: `200`
- `/comun/acompanhar/COMUN-TESTE`: `200`
- `/comun/relatar/confirmacao?protocolo=COMUN-TESTE`: `200`

Checagens de estado sensivel em producao:

- protocolo invalido: resposta generica, sem vazamento
- protocolo inexistente: resposta generica, sem vazamento

## Riscos restantes

1. Ainda nao existe rate limit dedicado para a consulta por protocolo.
2. O formato do protocolo reduz bastante a superficie, mas tentativa automatizada em massa ainda deve ser tratada num proximo tijolo.
3. A consulta publica ainda nao permite qualquer resposta ativa da pessoa; e somente leitura.

## Proximo tijolo recomendado

Adicionar limitacao de taxa e observabilidade minima para `/comun/acompanhar`, com trilha de tentativas invalidas e protecao contra brute force sem introduzir login publico.
