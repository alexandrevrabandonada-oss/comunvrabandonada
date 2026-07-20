# Sprint 31 — experiência central local

Data: 15/07/2026. Escopo executado integralmente em ambiente local, custo R$ 0. Não houve push, deploy, acesso ao Supabase remoto, R2 remoto, alteração de secrets ou reconfiguração do scheduler.

## Entregas

- shell e navegação finita compartilhados;
- home editorial em dez seções;
- página Participar orientada a objetivo, tempo e consequência;
- central pessoal e caixa de entrada privada por membro;
- busca pública unificada sem ranking de popularidade;
- continuidade das pautas e integração territorial com arte, rádio e acervo;
- componentes comuns, documentação e capturas em cinco viewports.

## Evidências

- reset local completo: passou;
- storage local: `COMUN_LOCAL_STORAGE_READY`;
- lint, typecheck e build Next.js 16.2.10: passaram;
- unitários: 18 arquivos, 101 testes passaram;
- RLS: `RLS_MATRIX_OK`; DB lint: sem erros;
- smoke central: `COMUN_CENTRAL_EXPERIENCE_LOCAL_OK`;
- autenticação comunitária local: `COMUN_COMMUNITY_AUTH_LOCAL_OK`;
- Axe: 35 combinações de rota/viewport sem violações sérias ou críticas;
- matriz Playwright: 54/55 passou numa rodada; o único caso era uma asserção incompatível com a navegação de tablet, corrigida e revalidada nas cinco viewports (5/5);
- revisão visual manual: desktop 1366×768 e mobile 360×800 sem overflow ou quebra estrutural.

## Regressão conhecida

O smoke legado `smoke:pauta-miniapp` falha antes de executar o fluxo porque procura literais com aspas simples e o tipo antigo `community_radio_future`; o registro atual usa aspas duplas e `community_radio`. O catálogo funcional existe. Não foi alterado neste sprint para evitar ampliar escopo.

`npm audit` registra duas vulnerabilidades moderadas herdadas em PostCSS dentro do Next; a correção sugerida exige `--force` e downgrade quebrável, portanto não foi aplicada.
