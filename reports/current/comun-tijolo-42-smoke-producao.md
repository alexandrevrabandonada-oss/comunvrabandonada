# Tijolo 42 — smoke de produção

Atualizado em 24 de julho de 2026.

## Identificação

- PR: [#31](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/31);
- merge SHA: `41d218fa670a24eef8d2a1ce3e3a35a9c5172a47`;
- domínio: `https://comunsocial.online`;
- CI da `main`:
  [run 30125728267](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30125728267),
  aprovado;
- Vercel: deployment concluído com sucesso no merge SHA.

## Resultado das rotas

| Superfície | Resultado |
| --- | --- |
| `/comun` | HTTP 200 |
| `/comun/pautas/calcadas-em-circulacao` | HTTP 404 |
| `/comun/calcadas` | HTTP 200 |
| `/comun/participar` | HTTP 200 |
| `/comun/minha-participacao` | HTTP 307, autenticação |
| `/comun/caixa-de-entrada` | HTTP 307, autenticação |
| `/maps/volta-redonda/volta-redonda.pmtiles` | HTTP 206 com `Range: bytes=0-1023` |

Nenhuma rota inspecionada respondeu com 5xx.

## Segurança

Nas páginas públicas inspecionadas não foram encontrados:

- `service_role`;
- chave de serviço;
- object key privado;
- coordenada exata;
- nota interna.

O domínio canônico permaneceu inalterado. Não houve migration, promoção,
alteração no Supabase remoto ou mudança de DNS.

## Bloqueador

O shell do Mapa das Calçadas contém links para
`/comun/pautas/calcadas-em-circulacao`, mas a rota retorna 404. Portanto, o
contrato de navegação pauta ↔ mapa está quebrado em produção.

## Decisão

`NO_GO_PAUTA_CANONICA_404`

Não declarar `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`.

O Tijolo 43 permanece não iniciado, o gate humano permanece 0/3 e o piloto
público permanece fechado.
