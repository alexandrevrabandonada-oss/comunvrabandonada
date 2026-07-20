# Sprint 33.2 — cobertura autenticada local

Data: 17/07/2026. Decisão técnica: **aprovada com lacunas, não integral**. Decisão humana: **NO-GO**. Promoção remota: **NO-GO**.

## Evidências

- 14 personas Auth locais reais mais visitante; identidades `.test`, cookies isolados e cleanup;
- matriz E2E autenticada: 15/15 em duas execuções completas, com login real, logout por limpeza de cookies e negação fechada;
- autorização server-side adicionada à central e detalhe; perfil suspenso e atribuição sem papel negados nos unitários;
- Axe/visual autenticados: 10/10 em cinco viewports, zero serious/critical, central e detalhe revisados;
- mobile 360/390 sem overflow, filas e retirada urgente alcançáveis;
- rehearsal autenticado: nove sessões distintas, `COMUN_FIRST_PILOT_AUTHENTICATED_REHEARSAL_LOCAL_OK` e cleanup;
- unitários: 28 arquivos, 186/186 nas rodadas vigentes;
- reset 1: aprovado;
- reset 2: aprovado após estabilização do Auth local; E2E 15/15 e rehearsal passaram;
- build Next.js 16.2.10: aprovado;
- RLS/DB lint: aprovados antes das rodadas; a migration apenas acrescenta coluna privada e constraint à tabela já classificada;
- readiness humano: `COMUN_PILOT_HUMAN_READINESS_INCOMPLETE`;
- go/no-go: `NO_GO_HUMAN_READINESS`, sem promoção automática.

## Lacunas e bloqueios

Screenshots próprios e Axe de todas as superfícies especializadas não foram concluídos; payload/RSS/queries autenticados não foram instrumentados. O gate final contra `next start` foi iniciado, mas sua saída não ficou verificável e o Docker Desktop tornou-se indisponível na retomada. Titulares, substitutos, canal, janela e revisão remota permanecem sem confirmação legítima.

## Declarações

- Piloto público real: NÃO ABERTO
- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Serviços externos: NÃO UTILIZADOS
- Dados reais: NÃO UTILIZADOS
- Protocolos reais: NÃO ENVIADOS
- Mensagens reais: NÃO ENVIADAS
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0
# Atualização Sprint 33.2.1

Cobertura expandida para 42/42 e 21 superfícies/estados. O fechamento técnico permanece NO-GO porque o reset pós-recriação de Auth e o gate Axe em `next start` falharam. Ver `estado-comun-sprint-33-2-1-fechamento-tecnico-local.md`.
