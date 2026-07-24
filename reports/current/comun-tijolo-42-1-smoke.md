# Tijolo 42.1 — smoke local e de produção

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

## Produção

- PR [#32](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/32)
  mesclada por merge commit;
- HEAD da branch: `a52c625e2221345311a93d6931491d3887e478cd`;
- merge SHA: `a989d517cd56d1051176eeb16675b019936e3244`;
- FULL pré-merge:
  [run 30128663490](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30128663490),
  aprovado;
- CI pós-merge:
  [run 30130058303](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30130058303),
  aprovado;
- deployment Vercel Production `5595972121`: aprovado;
- pauta canônica, Home, listagem de pautas, mapa e participação: HTTP 200;
- Minha Participação e Caixa de entrada: HTTP 307 esperado para autenticação;
- PMTiles: HTTP 206 com `Range`;
- navegação pauta ↔ mapa: aprovada;
- nenhum identificador editorial interno, segredo, bucket privado ou chave de
  serviço encontrado no HTML público inspecionado.

## Estado

- local: `COMUN_CANONICAL_SIDEWALK_PAUTA_OK`;
- produção: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`;
- Tijolo 43: `TIJOLO_43_UNBLOCKED`;
- gate humano: 0/3;
- piloto público: fechado.
