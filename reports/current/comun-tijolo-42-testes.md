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

`COMUN_NUCLEO_VIVO_READY`
