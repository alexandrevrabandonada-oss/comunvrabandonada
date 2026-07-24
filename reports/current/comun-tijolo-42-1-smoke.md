# Tijolo 42.1 — smoke local

Atualizado em 24 de julho de 2026.

## Resultado local

- `npm ci`: aprovado;
- typecheck: aprovado;
- lint: aprovado;
- unitários: 263/263;
- build Next.js: aprovado;
- `smoke:comun-pauta-canonica`:
  `COMUN_CANONICAL_SIDEWALK_PAUTA_OK`;
- `smoke:comun-nucleo-vivo`: `COMUN_NUCLEO_VIVO_LOCAL_OK`;
- E2E: 14/14 em Pixel 7 e Desktop Chrome;
- Axe: 8/8, sem violações sérias ou críticas;
- overflow horizontal: ausente;
- fixtures: `COMUN_TEST_FIXTURES_CLEAN`.

## Contratos comprovados

- pauta canônica: HTTP 200 na stack local reconciliada;
- pauta → mapa e mapa → pauta;
- seis fases do `PautaAppShell`;
- `returnTo` allowlisted para a pauta;
- registro público local existente substitui o fallback;
- ausência, privacidade, arquivamento, erro de consulta e slug desconhecido
  cobertos por testes unitários;
- identificador editorial não aparece no conteúdo da página;
- nenhum `service_role`, object key ou coordenada exata no contrato público.

## Estado

Local: `COMUN_CANONICAL_SIDEWALK_PAUTA_OK`.

Produção permanece `NO_GO_PAUTA_CANONICA_404` até FAST, FULL, Vercel, merge e
smoke público no novo SHA.
