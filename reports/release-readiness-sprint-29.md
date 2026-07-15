# Release readiness — Sprint 29

Data: 15/07/2026.

## Decisão

**READY para continuidade local; NOT READY para promoção remota.** A base funcional, segurança, portal, pauta, testes, reset duplo e cleanup passaram. Nenhum deploy ou push foi autorizado ou executado.

## Gates

| Gate | Estado | Evidência |
| --- | --- | --- |
| Modelo e migration | PASS | obra reutiliza `comun_archive_items`; especializações e constraints aplicam no reset local |
| Agentes, créditos e direitos | PASS | estruturas genéricas, múltiplos créditos e autorização granular |
| Publicação fail-closed | PASS | smoke bloqueia direito parcial e publica apenas após exibição autorizada |
| Privacidade e RLS | PASS | `RLS_MATRIX_OK`, grants anon/auth revogados e consultas sanitizadas |
| Menores/localização | PASS | revisão reforçada e bloqueadores de publicação |
| Portal, coleções e pauta | PASS | portal finito e `art_gallery` validado, sem ranking/feed infinito |
| Minha Participação | PASS | contribuição pending e resposta sem notas privadas |
| Unitários | PASS | 93 testes |
| E2E e axe | PASS | 20 testes, quatro viewports, zero serious/critical nas páginas cobertas |
| Production-like | PASS | build e `npm run start` local usados pelo Playwright |
| Reset duplo | PASS | duas reconstruções e duas execuções do smoke territorial |
| Cleanup | PASS | fixtures removidas e assert-clean aprovado |
| Storage local real | PASS com procedimento | upload/download/Sharp/privacidade/cleanup passaram duas vezes; readiness e restart limitado do Kong corrigem upstream antigo após reset |
| Alertas/auditoria completa | PASS | fingerprints, resolução automática e payload recursivamente sanitizado |
| Dependências | PASS com ressalva | zero high/critical; duas moderadas sem `npm audit --force` |

## Promoção futura

Antes de qualquer ambiente remoto: corrigir o `.env.local` por gestão explícita de ambiente, manter o readiness do Storage, repetir a suíte e realizar revisão humana de direitos, menores e retirada. O RC local está aprovado; promoção remota continua fora de escopo.

## Sprint 30 — Rádio Comunitária

Recomenda-se reutilizar `comun_archive_agents`, `comun_archive_items`, direitos e relações para programas e episódios, começando por diagnóstico de áudio, consentimento de voz e direitos musicais. A integração `artwork_future_radio_feature` deve continuar apenas relacional: não duplicar obras nem presumir licença para capa, redes ou transmissão.

## Declarações

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0
