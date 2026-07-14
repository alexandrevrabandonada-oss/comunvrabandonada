# Tijolo 26 - Verify

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Comandos locais

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.

## Servidor local

- URL usada nos smokes: `http://localhost:3000`.
- Servidor local iniciado para verificacao HTTP e encerrado ao final.

## Observacao tecnica

O carregamento de pauta/comunidade/categoria para snapshots foi feito em consultas explicitas server-side, evitando dependencia de join aninhado ambiguo na cadeia snapshot -> dossie -> pauta.
