# Sprint 33 — operação editorial local

Data: 16/07/2026. Status: **candidato operacional local implementado e verificado**.

## Entrega

- consolidado e diagnóstico transversal do piloto de calçadas;
- central privada com dez filas finitas e detalhes contextuais;
- papéis separados, atribuição sem elevação de privilégio e transições humanas;
- prazos indicativos, mensagens internas sanitizadas e histórico auditável;
- ensaio de 26 etapas com volume de 100 itens e dez classes de incidente;
- backup/restore dry-run com inventário e SHA-256;
- exportação de pauta por allowlist;
- política de moderação, governança e preparação do primeiro piloto.

## Evidências

- guardas iniciais: ambiente local, Storage, DB lint e matriz RLS passaram;
- migration aplicada do zero; o reset terminou com o 502 conhecido do gateway após aplicar todas as migrations, e o readiness voltou a passar depois do restart restrito de PostgREST/Kong;
- smoke: `COMUN_EDITORIAL_OPERATION_LOCAL_OK` e `COMUN_TEST_FIXTURES_CLEAN`;
- testes focados: 6/6; suíte integral: 22 arquivos e 157/157;
- typecheck, lint, build Next.js 16.2.10 e DB lint: passaram;
- tabelas operacionais: RLS ativa, sem grants anon/authenticated, service-role server-only.

## Limites e declarações

- piloto público real: NÃO ABERTO
- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- migrations remotas: NÃO APLICADAS
- R2 real: NÃO UTILIZADO
- APIs/IA externas: NÃO UTILIZADAS
- dados, contatos, áudio ou contribuições reais: NÃO INSERIDOS
- atividade de campo, protocolo ou mensagem real: NÃO REALIZADA
- cron e secrets: NÃO ALTERADOS
- `npm audit --force`: NÃO EXECUTADO
- custo externo: R$ 0

## Atualização Sprint 33.1

Restore real em banco descartável, reset duplo, build/`next start`, 178 unitários, E2E protegido, Axe, incidentes, capacidade, rehearsal e regressões foram comprovados. A decisão permanece NO-GO para abertura e promoção por gates humanos e cobertura autenticada pendentes. Ver `reports/estado-comun-sprint-33-1-gate-piloto-local.md`.
