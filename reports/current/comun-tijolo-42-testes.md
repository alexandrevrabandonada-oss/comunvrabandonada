# Tijolo 42 — testes

## Comandos canônicos

- `npm run test:e2e:comun-nucleo-vivo`
- `npm run test:a11y:comun-nucleo-vivo`
- `npm run smoke:comun-nucleo-vivo`

## Cobertura

- Home pública e descoberta da pauta.
- Ciclo fixo da pauta.
- Vínculo pauta ↔ Mapa das Calçadas.
- Retorno explícito em mobile e desktop.
- WCAG automatizada nas superfícies centrais.
- Ausência de overflow horizontal.
- Contrato estático sem segredo de serviço.

## Resultado local — 24 de julho de 2026

- typecheck: aprovado;
- lint: aprovado;
- unitários: 256/256;
- smoke: `COMUN_NUCLEO_VIVO_LOCAL_OK`;
- jornada E2E: 10/10 em Pixel 7 e Desktop Chrome;
- Axe: 6/6 superfícies sem violações sérias ou críticas;
- overflow horizontal: ausente nas superfícies auditadas.

O wrapper canônico que descobre o Supabase pelo projeto vinculado encontrou uma
stack local já ativa sob outro identificador. Para não parar ou recriar dados,
a execução Playwright usou a mesma aplicação local via `COMUN_BASE_URL`. Não
houve acesso remoto. O gate humano permanece 0/3.

## CI final — HEAD técnico `072006b458d04319a983d7823ed814199f8884da`

- PR: [#31](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/31);
- FAST: aprovado;
- FULL: aprovado no
  [run 30122395558](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30122395558);
- Vercel Preview: aprovado;
- dois ensaios independentes de reconciliação: aprovados, com hashes
  equivalentes;
- regressões críticas: aprovadas;
- no-leak e cleanup: aprovados;
- fixtures finais: limpas.

### Histórico de estabilização

A primeira execução FULL encontrou duas expectativas antigas da suíte
`miniapp-experience`: “Ferramentas em atividade” e o texto estático de contexto
mobile. Elas foram atualizadas para os contratos vigentes “Sua próxima
participação” e o link “Voltar à pauta Calçadas em circulação”.

Uma repetição intermediária recebeu `502` transitório durante o segundo reset
local do Supabase. A repetição controlada no HEAD final passou pela mesma etapa
sem alteração de workflow. Nenhuma dessas ocorrências envolveu Supabase remoto.

## Decisão

## Validação pós-merge

- merge SHA: `41d218fa670a24eef8d2a1ce3e3a35a9c5172a47`;
- CI da `main`: aprovado no
  [run 30125728267](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30125728267);
- Vercel: aprovado no merge SHA;
- Home, mapa e participação: HTTP 200;
- superfícies autenticadas: HTTP 307 esperado;
- PMTiles: HTTP 206;
- pauta canônica “Calçadas em circulação”: HTTP 404;
- respostas 5xx: nenhuma;
- varredura das páginas públicas inspecionadas: nenhum `service_role`, object
  key ou coordenada exata encontrado.

Decisão técnica pré-merge: `COMUN_NUCLEO_VIVO_READY_TO_MERGE`.

Decisão vigente do smoke: `NO_GO_PAUTA_CANONICA_404`.

`COMUN_NUCLEO_VIVO_PRODUCTION_GREEN` não foi declarado e o Tijolo 43 não foi
iniciado.

## Hotfix 42.1

- typecheck, lint e build: aprovados;
- unitários: 263/263;
- smoke canônico: `COMUN_CANONICAL_SIDEWALK_PAUTA_OK`;
- smoke do núcleo vivo: `COMUN_NUCLEO_VIVO_LOCAL_OK`;
- E2E atualizado: 14/14;
- Axe atualizado: 8/8;
- fixtures: `COMUN_TEST_FIXTURES_CLEAN`.

O teste agora exige HTTP 200 na pauta, as seis fases, navegação bidirecional,
retorno allowlisted e ausência do identificador editorial na interface.

## Fechamento do hotfix 42.1

- PR [#32](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/32):
  mesclada por merge commit;
- branch HEAD: `a52c625e2221345311a93d6931491d3887e478cd`;
- merge SHA: `a989d517cd56d1051176eeb16675b019936e3244`;
- FULL pré-merge: run `30128663490`, aprovado;
- CI pós-merge: run `30130058303`, aprovado;
- Vercel Production deployment `5595972121`: aprovado;
- pauta canônica: HTTP 200;
- Home, pautas, mapa e participação: HTTP 200;
- superfícies autenticadas: HTTP 307 esperado;
- PMTiles: HTTP 206;
- pauta ↔ mapa: aprovado;
- resposta 5xx: nenhuma nas superfícies inspecionadas;
- vazamento público dos marcadores sensíveis auditados: nenhum.

Decisão final: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`.

O Tijolo 43 está `TIJOLO_43_UNBLOCKED`. Isso não altera o gate humano 0/3 nem
abre o piloto público.
