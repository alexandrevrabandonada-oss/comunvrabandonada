# Sprint 32.1 — vertical completa das calçadas

Status: **release candidate local aprovado** em 16/07/2026.

## Matriz vertical

Contribuição, upload real, original privado, revisão, derivada pública, registro territorial, mapa/lista, observação, snapshot idempotente, roda, síntese, priorização, proposta, tarefa, ação, protocolo, resposta, resultado, Arte, Rádio, memória, Minha Participação, caixa de entrada, home, território, correção e retirada foram exercitados pelo smoke de 32 etapas. Resultado: `COMUN_SIDEWALK_VERTICAL_LOCAL_OK` e `COMUN_TEST_FIXTURES_CLEAN`.

## Gates

- unitários: 20 arquivos, 151 testes;
- E2E: 75/75 em quatro execuções vigentes;
- Axe: 25/25, zero serious/critical;
- visual: 40/40 revisadas, artefatos por hash corrigidos;
- RLS: `RLS_MATRIX_OK`; DB lint sem erros;
- reset 1: aprovado após restart restrito de PostgREST/Kong causado pelo 502 conhecido;
- reset 2: aprovado; primeira tentativa teve colisão transitória interna na inicialização e a repetição completa aplicou 50 migrations;
- production-like: build + `next start`, smoke, E2E, Axe, no-leak e cleanup aprovados;
- cleanup final: zero fixtures e objetos de Storage do teste.

## Regressões

| Smoke | Resultado | Duração | Cleanup |
| --- | --- | ---: | --- |
| sidewalk-pilot | passou | 10,1 s | limpo |
| central-experience | passou | 10,2 s | limpo |
| pauta-miniapp | passou | 8,3 s | limpo |
| community-radio | passou | 9,9 s | limpo |
| territorial-art-storage | passou | 7,9 s | limpo |
| territorial-art | passou | 21,7 s | limpo |
| community-auth:local | passou | 21,9 s | limpo |
| public-ui:local | passou | 24,0 s | limpo |
| no-leak-http | passou | 17,3 s | limpo |

## Privacidade e custos

Anon/authenticated não têm leitura ampla; service role permanece server-only. Originais, contatos, coordenadas precisas, documentos de direito, pendências, tarefas internas, drafts e inbox de outros membros ficam protegidos. Sanitização recursiva foi adicionada a protocolos e observações.

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- APIs externas: NÃO UTILIZADAS
- Dados reais: NÃO INSERIDOS
- Atividade de campo real: NÃO REALIZADA
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0

Bloqueios restantes: nenhum para o RC local. Warnings de módulos ESM sem `type: module` permanecem informativos e fora do escopo funcional.
