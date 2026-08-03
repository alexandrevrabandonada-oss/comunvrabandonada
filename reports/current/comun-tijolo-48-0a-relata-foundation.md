# COMUN — Tijolo 48.0A — Fundação do COMUN Relata

## 1. Resultado

Resultado final documental: `COMUN_RELATA_FOUNDATION_BLOCKED_POSTMERGE_QUALITY_NETWORK_CHROMIUM_SIGSEGV`. A PR principal foi integrada e Production recebeu o SHA exato, mas o workflow pós-merge de qualidade falhou duas vezes no teste de rede por crash SIGSEGV do Chromium headless. O retry focal no mesmo SHA repetiu a falha; isso é blocker de infraestrutura, não finding de produto. O tijolo não inicia 47.9D, não torna App V2 padrão e não aciona `launch_publicly`.

## 2. Base

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- baseline confirmado após `git fetch --all --prune`: `d14f1aed1eca46b330b661935e6c73122390e708`;
- `origin/main` foi exatamente o baseline esperado e passou na verificação de ancestralidade;
- Production: `https://comunsocial.online`;
- endpoint de qualidade confirmou o SHA do baseline;
- PWA informada: `comun-pwa-v3`.

## 3. Branch

`codex/tijolo-48-0a-comun-relata-foundation` (worktree limpo derivado do `origin/main`).

## 4. Candidate

Implementação aditiva em módulos `lib/comun-relata-*`, rota protegida `/comun/relata`, testes focais e documentação. O fluxo legado `/comun/relatar` não foi modificado.

## 5. PR

PR #148 — `TIJOLO 48.0A — fundação do COMUN Relata` — mesclada.

## 6. Merge

Merge commit: `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`.

## 7. Deployment

Production confirmou `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b` em `/api/comun/quality-status`, com PWA `comun-pwa-v3`. Smoke read-only: `/comun/relata` `404`, `/comun` `200`, rollback `?experiencia=legacy` `200`, sem marcador Relata na Home.

## 8. Domínio e flag

`COMUN_RELATA_PREVIEW=enabled` habilita somente o preview local/preview deploy. Ausente ou diferente de `enabled` falha fechado; a rota responde indisponível. Não há query flag, link público, metadata, sitemap ou indexação adicionados.

## 9. Shell e rota

`/comun/relata` usa `ComunShell` em `member_nested`: app bar contextual, bottom navigation ausente, footer ausente no App V2, safe area e scroll documental. Os sete modos existentes permanecem no contrato canônico. O relato legado continua separado.

## 10. Modelo de domínio

Foram definidos tipos puros para `Report`, `Case`, `Agency`, `Channel`, `RoutingRule`, `RoutingDecision`, `Submission`, `Protocol`, `StatusEvent`, `Consent`, `Attachment`, `PrivateLocation`, `PublicLocation`, `PublicSnapshot` e `EscalationRule`.

## 11. Privacidade

Classes: `public_safe`, `public_after_sanitization`, `restricted`, `sensitive`, `high_risk`. Localização exata, contatos, pessoas, crianças, saúde, ameaça/retaliação e anexos são conservadores; mapa e publicação automática ficam bloqueados quando aplicável.

## 12. Roteamento

Engine pura `relata-routing-v1`, sem LLM. Distingue iluminação pública, distribuição de energia, risco elétrico, emergência e fumaça/vestígio. A frase “A rua está toda escura” não é suficiente e gera a pergunta: “As casas também estão sem energia ou apenas as luminárias da rua?”.

## 13. Canais

Catálogo somente com fixtures abstratos e `unverified_fixture`, sem URL, telefone, e-mail ou integração real.

## 14. Protocolos

Preview gera `COMUN-LOCAL-*`, `kind=comun`, `isOfficial=false`, `officialProtocol=null`, `localOnly=true`. A UI mostra explicitamente: “Nenhum órgão público recebeu esta manifestação ainda.”

## 15. UI

Título “O que está acontecendo?”, descrição curta, textarea sem localização/anexo/contato, no máximo três perguntas, resultado com urgência, esfera abstrata, privacidade, dados ausentes, próximo passo e limites. Não há mutation.

## 16. Segurança de logs

`sanitizeRelataLogEvent` remove texto, resumo, contatos, endereço, nome, pessoa, coordenadas, anexos, URL, tokens e segredos. O preview registra apenas códigos e estado sanitizados.

## 17. Testes focais

Vitest cobre flag fail-closed, privacidade, sanitização, cinco famílias de roteamento, pergunta de desambiguação e protocolo local. Playwright cobre fluxo, ausência de navegação e zero requests de escrita em cinco viewports. Axe cobre critical/serious em todos os cinco projetos.

## 18. Acessibilidade

Labels persistentes, foco visível herdado, live region no resultado/perguntas, alvos de toque amplos e sem movimento contínuo. Axe focal: verde (0 critical/serious).

## 19. Performance/PWA

Build de produção local passou. Não houve mudança no service worker, PWA ou runtime; o projeto de teste inclui viewport PWA standalone 430×932.

## 20. Regressão local executada

- `npm ci --ignore-scripts`;
- `npm run typecheck` — passou;
- `npm run lint` — passou;
- `npm run build` — passou;
- quatro arquivos Vitest focais — 11/11 passaram;
- `npm run test:e2e:comun-relata` — 10/10 passaram (5 viewports × fluxo + Axe).

## 21. Compatibilidade

Nenhuma rota existente foi removida ou redirecionada. `/comun/relatar`, `app/actions.ts`, `lib/reports.ts`, canais reais e mutations canônicas permanecem intactos. Rollback `?experiencia=legacy` permanece preservado.

## 22. Migração

Zero migrations, zero SQL executável, zero escrita remota. O desenho está em `reports/current/comun-relata-schema-proposal.md`.

## 23. Evidência negativa

O teste de navegador observou zero request para Supabase, `/rest/v1` ou APIs de reports/relata durante triagem. A ausência de link Relata na navegação foi verificada.

## 24. Riscos abertos

Persistência, idempotência real, canais verificados, consentimento durável, localização privada, anexos e protocolo oficial ficam para 48.0B. O flag é de build/runtime de ambiente e deve permanecer desligado na produção até novo gate.

## 25. Roadmap

48.0A fundação local; próximo tijolo `48.0B — persistência/local verified channels/durable COMUN protocol`, ainda sem envios reais. 47.9D permanece não iniciado.

## 26. Critério de integração e blocker pós-merge

Os gates da PR foram verdes (Preview READY, zero P0/P1, flag desligada, App V2/legado intactos, sem migration/escrita/integração, no-leak e regressão). Após o merge, o job `COMUN Quality Performance Deliverability` falhou em `6. Rede degradada em navegador isolado`: `browser.newContext` encerrou porque o Chromium recebeu `SIGSEGV`. O retry focal do mesmo SHA repetiu o mesmo crash. PWA, acessibilidade sintética, performance sintética, no-leak e preflight do SHA passaram. O blocker permanece separado de produto.

## 27. Estado final emitido

`COMUN_RELATA_FOUNDATION_BLOCKED_POSTMERGE_QUALITY_NETWORK_CHROMIUM_SIGSEGV`. O preview continua dormente em Production, sem qualquer envio real; o próximo passo é repetir o job de rede em runner/browser estável antes de promover o resultado.
