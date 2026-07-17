# Relatório do estado atual — COMUN

Data de referência: 17/07/2026. Escopo: estado técnico local após a Sprint 33.2.1; este relatório não autoriza piloto público, promoção remota, deploy ou push.

## Situação geral

O projeto está em uma branch local de trabalho (`codex/comun-admin-auth-remote`), 112 commits à frente do remoto. Não houve push, deploy, uso de Supabase remoto, R2 real ou serviço externo nesta verificação.

O ambiente local do Supabase está disponível: banco, Auth, Storage, REST e gateway estão ativos. O serviço `vector` está reiniciando continuamente, mas não bloqueou os testes cobertos; deve ser acompanhado antes de qualquer ampliação de escopo. Não há usuários, identities ou perfis de fixture remanescentes no banco local neste checkpoint.

### Vector local

Classificação: **opcional para esta validação**. O log mostra que a fonte `docker_host` do Vector falha ao listar containers com `Network unreachable`; o processo encerra e o Docker o reinicia aproximadamente a cada minuto. Banco, Auth e Storage seguem saudáveis e os gates de sessão, RLS e lint não dependem desse coletor. Não foi alterada a rede nem a configuração do Vector; o loop continua como pendência de observabilidade local antes de qualquer promoção futura.

## O que está comprovado

| Área | Estado | Evidência |
|---|---|---|
| Cobertura E2E autenticada | PASS | 42/42 após armazenamento tardio e reabertura em contexto novo |
| Perfis e autorização negativa | PASS | 8 negações cruzadas, visitante e sessão expirada cobertos |
| Unitários anteriores | PASS | 198/198 na execução atual |
| Cadeia de storageState | PASS | 10 rodadas consecutivas com login, refresh, contexto novo, Axe simples, logout e cleanup |
| RLS e lint do banco | PASS | `RLS_MATRIX_OK`; DB lint sem erro no checkpoint anterior |
| Storage local | PASS | `COMUN_LOCAL_STORAGE_READY` no checkpoint anterior |
| Cleanup de fixtures | PASS | banco atualmente com 0 usuários Auth, 0 identities e 0 perfis de fixture |
| Axe autenticado isolado | PASS | 15/15 testes, zero serious/critical e cleanup próprio |
| Visual autenticado isolado | PASS | 15/15 testes, viewport do projeto aplicado e cleanup próprio |

## Bloqueio técnico atual

O fechamento técnico permanece **NO-GO**. A falha original foi reproduzida no ciclo Auth: as suítes repetiam login pela interface em volume maior que a janela de proteção local e a factory removia/recriava os mesmos e-mails sem validar integralmente identity, sessão e refresh.

Correções locais já iniciadas, ainda não fechadas por todos os gates:

- factory idempotente com `COMUN_TEST_RUN_ID`, e-mails únicos, verificação de identity, perfil, papel, login e refresh;
- diagnóstico mínimo e `auth:readiness:local` criados;
- setup/teardown comum para E2E, Axe e visual;
- storageStates em diretório local ignorado pelo Git;
- validação posterior mostrou que o storageState era salvo antes de confirmar a navegação pós-login. A correção para aguardar e reabrir o estado salvo está em andamento, mas ainda precisa passar no Axe integral.

Portanto, os itens abaixo seguem pendentes:

1. Repetir E2E após o segundo Axe para completar a sequência de independência.
2. Reset 1 e Reset 2 completos.
3. Gate contra `npm run start`, incluindo Axe.
4. Instrumentação de performance autenticada contra `next start`.
5. Regressões completas.

## Bloqueio de continuidade seguro

Os gates de reset, `next start` e performance não foram executados neste checkpoint: `supabase/seed.sql` não rastreado é carregado pelo reset local e `npm run typecheck` falha em alterações paralelas de `lib/media-storage/*`. Para não executar ou corrigir trabalho fora do escopo Auth, a decisão técnica permanece **NO-GO local** até a separação ou autorização explícita desses diffs.

## Evidências anteriores que continuam válidas

- Reset 1 anterior: reset, Storage, unitários e E2E passaram; Axe falhou após recriação de Auth.
- Production-like anterior: build e E2E passaram; Axe falhou; o marcador `COMUN_AUTHENTICATED_PRODUCTION_LIKE_LOCAL_OK` não foi emitido.
- Performance: mecanismo local-only foi adicionado, mas a tabela completa não foi medida porque o gate anterior falhou.

## Estado humano e remoto

- Readiness humano: `COMUN_PILOT_HUMAN_READINESS_INCOMPLETE`.
- Piloto público real: NÃO ABERTO.
- Decisão humana: NO-GO.
- Decisão de promoção remota: NO-GO / não autorizada.

## Integridade do workspace

Há alterações locais não commitadas, incluindo código de infraestrutura Auth, capturas visuais, fixtures, relatórios e arquivos possivelmente pertencentes a trabalhos paralelos (`.env.example`, `lib/media-storage/*`, `supabase/seed.sql`). Elas foram preservadas e não devem ser descartadas sem revisão específica.

## Próximo passo seguro

Executar Axe e visual de forma independente usando as sessões validadas, e só então repetir resets e `next start`. Até isso ocorrer, a decisão técnica é **NO-GO local**.

## Declarações de escopo

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Serviços externos: NÃO UTILIZADOS
- Dados reais: NÃO UTILIZADOS
- Protocolos e mensagens reais: NÃO ENVIADOS
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0
