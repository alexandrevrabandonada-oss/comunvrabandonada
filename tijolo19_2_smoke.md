# Tijolo 19.2 - smoke

Data: 2026-07-07

## Smoke novo

Arquivo:

- `scripts/smoke-comun-pauta-dossier-review-queue.mjs`

Comando:

- `npm run smoke:pauta-dossier-review-queue`

## Cobertura

O smoke:

1. cria pauta teste;
2. cria dossies em estados diferentes;
3. confirma pendente factual;
4. confirma pendente editorial;
5. confirma factual aprovado faltando editorial;
6. confirma editorial aprovado faltando factual;
7. confirma bloqueio por mesmo revisor;
8. confirma ajustes solicitados;
9. confirma rejeitados;
10. confirma prontos para publicar;
11. registra nova revisao editorial e confirma mudanca de categoria;
12. confirma que a rota admin exige sessao e nao expoe segredo sem login;
13. limpa dados de teste.

## Resultado local

Status: passou.

Ambiente:

- build local em `http://127.0.0.1:3019`.

## Resultado producao

Status: passou.

Ambiente:

- `https://comunvrabandonada.vercel.app`.

## Seguranca validada

O smoke usa segredo interno em notas de revisao e confirma que a rota admin sem sessao nao retorna esse conteudo. A rota publica de dossies nao foi alterada neste tijolo.
