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
