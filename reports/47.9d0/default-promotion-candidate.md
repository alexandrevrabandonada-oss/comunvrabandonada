# TIJOLO 47.9D0 — candidata de promoção controlada do App V2

- Base: `da76487568611b7e137b2c6798357250779af7cf`
- Branch: `codex/tijolo-47-9d0-v2-default-promotion`
- PR anterior: `#146`, estabilização visual mesclada e validada em Production
- Resultado terminal pretendido somente após merge e validação de Production:
  `COMUN_APP_V2_DEFAULT_STABILIZED_READY_FOR_BROAD_HUMAN_REHEARSAL`

## Contrato promovido

| Entrada               | Experiência       | Indexação                             |
| --------------------- | ----------------- | ------------------------------------- |
| `/comun/...`          | App V2 canônico   | canônica                              |
| `?experiencia=app-v2` | App V2 compatível | canonical sem flag; `noindex, follow` |
| `?experiencia=legacy` | legado temporário | canonical sem flag; `noindex, follow` |

`resolveComunExperience` é a autoridade única. Ausência e valores inválidos são
seguros e resolvem para App V2; somente `legacy` seleciona a versão anterior.
`withComunExperience` remove a query no V2 e a escreve explicitamente no
rollback. O wrapper booleano também produz legado explícito quando recebe
`false`.

O kill switch opcional `COMUN_DEFAULT_EXPERIENCE=legacy` redireciona somente
requisições sem escolha explícita. Valor ausente ou inválido mantém o V2; links
com `app-v2` e `legacy` continuam determinísticos e não formam loop.

## Continuidade e segurança

- header, footer, app bar, bottom navigation, busca, filtros, journey context,
  auth, onboarding, redirects e retornos administrativos usam o contrato
  central;
- destinos V2 internos são normalizados sem perder filtros, hash, origem,
  entidade ou `returnTo`;
- rollback permanece explícito em navegação e formulários compartilhados;
- o limite do shell legado preserva também links e filtros internos brutos,
  inclusive abertura modificada em nova aba, sem interceptar destinos externos;
- admin anônimo continua redirecionado ao login; o recorte filtrado é
  sanitizado e preservado;
- nenhuma mutation, regra política, RLS, dado, rota ou deep link foi removido;
- variantes recebem canonical HTTP e `X-Robots-Tag: noindex, follow`.

## PWA

- manifest mantém `start_url: /comun` e `scope: /comun/`;
- namespace promovido para `comun-pwa-v3`;
- ativação remove caches `comun-pwa-*` anteriores;
- rotas privadas, auth, admin, Inbox, conta, APIs, query strings e mutações
  continuam fora do cache público;
- logout continua removendo caches de conteúdo; o shell seguro é preservado;
- instalação existente recebe o worker novo e oferece atualização explícita,
  evitando shell híbrido.

## Matriz focal da candidata

- 422 testes unitários verdes;
- 17 cenários aplicáveis de promoção verdes em 320 × 568, 360 × 800,
  390 × 844, landscape, desktop e PWA standalone;
- 6/6 cenários focais de promoção verdes no 360 × 800 após a correção da
  fronteira de rollback;
- 35/35 do App Shell V2 verdes;
- 35/35 das superfícies administrativas verdes em cinco viewports;
- 40/40 do grafo cívico verdes;
- auth V2 canônico e legado explícito comprovados;
- admin protegido e `returnTo` canônico/legado comprovados;
- canonical/noindex de `app-v2` e `legacy` comprovados;
- manifest e service worker v3 comprovados;
- acessibilidade automatizada: 27/27 qualidade, 5/5 jornadas e 5/5 shell;
- performance: 9/9 perfis;
- smokes públicos, superfícies, no-leak, qualidade e segurança verdes;
- regressão integral local concluída; Preview/Production continuam gates do
  merge e da emissão terminal.

## Estados que permanecem fechados

- 47.9A continua aguardando ensaio humano ampliado;
- 47.9B continua bloqueado pelo provider;
- 47.9C continua aguardando aparelhos e tecnologias assistivas reais;
- `security_resilience` continua bloqueado por redundância durável;
- `miniapps` continua condicionado à evidência real;
- `archive_radio_art` continua condicionado a conteúdo real;
- `launch_publicly` continua fechado.

Próximo tijolo, sem iniciá-lo nesta candidata: **47.9D — Ensaio humano
ampliado, aparelhos reais e consolidação**.
