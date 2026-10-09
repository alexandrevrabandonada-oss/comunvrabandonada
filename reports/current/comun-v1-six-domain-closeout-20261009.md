# COMUN V1 — fechamento dirigido dos seis domínios, 09/10/2026

Estado: `COMUN_V1_DELIVERABILITY_AUDIT_BLOCKED`. Nenhum domínio promovido;
`pilot_noindex` preservado; `launch_publicly` não autorizado nem executado.

## Referência e limites

Base Git: `400b17b350a00de913b6e802586c890c1e2999d9` (#538 integrado).
Auditoria original: [run 37964329098](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37964329098),
job `113934758298`, em 09/10 às 14:10:47 BRT. Código daquela run:
`041f6b17a49286249fb8290428b7422695a87937`, anterior ao #538. Não atribuir
esse resultado ao SHA posterior sem execução própria.

A nova execução local do auditor contra o host canônico terminou em 09/10 às
20:50:00 BRT: nove rotas 200/contratos válidos, três redirecionamentos administrativos
para login, manifest/robots/sitemap válidos, sitemap vazio, headers e noindex
confirmados, os mesmos seis findings. GET separado de `/api/comun/quality-status`
confirmou `version=400b17b350a00de913b6e802586c890c1e2999d9`,
`serviceWorker=comun-pwa-v3`, `telemetry=aggregate_only`,
`realDeviceEvidence=required`. Esta execução usa o auditor desta branch;
a correção do auditor ainda não está em Production. HTTP/HTML não comprovam
hidratação, usabilidade, direitos editoriais, conteúdo autorizado ou backup.

A issue [#95](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/95)
e seus comentários foram lidos; o corpo M0 histórico não foi sobrescrito.
O resumo conta **estados declarados**, não seis defeitos técnicos individuais.
Os quatro domínios anteriormente verdes não foram reabertos nem recertificados.

## Matriz de fechamento

| Domínio / estado preservado                 | Prova válida reutilizável                                                                                                                                                                                                                                                                  | O que ainda fecha o domínio                                                                                                                                                                     | Natureza / próximo passo                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `miniapps` / `in_progress`                  | Motor e classificador em `lib/miniapp-contract.ts` e `lib/sidewalk-pilot.ts`; #518 integrado com servidor/build exclusivos e pós-merge PWA/miniapp aprovado.                                                                                                                               | Artifact atual completo da janela original, participantes/registros/territórios suficientes, SLA, acompanhamento, resolução verificada e ausência de P0/P1.                                     | Operacional/humano. Executar o leitor read-only já existente em ambiente autorizado; preservar denominadores. Não reiniciar o piloto ou importar fixtures.                                                                                    |
| `archive_radio_art` / `evidence_required`   | Raiz editorial comum, RLS, buckets/derivadas e contratos. Mesa de curadoria #378 e fronteira de publicação #380/#389 integradas.                                                                                                                                                           | Um ciclo real autorizado em cada recorte (Acervo/Rádio/Arte), proveniência, direitos, curadoria, alt/transcrição e smoke público autorizado.                                                    | Editorial/operacional. Reutilizar a Mesa e publishers especializados. Nenhuma autoria/licença é presumida. #436 e #517 permanecem abertos e não são entrega de main.                                                                          |
| `security_resilience` / `blocked`           | RLS/retention/incidentes e testes; #530 corrigiu janela de expiração. Recuperação parcial posterior: banco real offline (278 tabelas), Auth API sintética sobre cópia restaurada e Storage API (2582 objetos), com provas delimitadas. Nova custódia de chave e mapping em E: registrados. | Backup recente durável independente, continuidade/custódia efetiva, cobertura de configuração externa e restore integral atual com banco/Auth/Storage, APIs/negações e RPO/RTO.                 | Técnica + operação + decisões já documentadas. Acesso protegido, destino isolado, responsáveis e escopo de cópia/custo devem estar satisfeitos; não contratar nem exportar nesta rodada. Atualização de sharp preparada separadamente abaixo. |
| `quality_performance` / `evidence_required` | #518 PWA/miniapp; #519 filtros públicos e 25 casos PostgREST; #528 leitura remota sem transportador; #531 higiene dos tipos gerados; #536 CA restrita. Laboratório não é campo.                                                                                                            | Android físico popular, segunda plataforma física, AT real, matriz residual PWA/auth/cache/logout, baixo sinal e amostra de campo suficiente com budgets.                                       | Humano/operacional. Usar `docs/comun-quality-real-device-rehearsal.md`; emulação não conta como aparelho físico.                                                                                                                              |
| `content_governance` / `blocked`            | Ajuda, orientação de primeira ação, explicação de segurança e operação editorial existem no código. Isso não é revisão ou designação operacional.                                                                                                                                          | Conteúdo inicial autorizado; onboarding/ajuda revisados; normas e política editorial; privacidade/termos; contato efetivamente atendido; titular e substituto da operação, retirada/devolutiva. | Editorial/humano. Consolidar textos existentes e verificar responsáveis/canais. Não inventar nomes, aceites, SLA ou compromissos.                                                                                                             |
| `launch_rehearsal` / `blocked`              | Ambiente e smoke LAN registrados; protocolo único `docs/gates/COMUN_HUMAN_GATE.md`; agregador de sessões rejeita duplicatas/ausência de consentimento.                                                                                                                                     | Três sessões reais consentidas completas, P0/P1 tratados, estabilidade observada por 72h e decisão terminal única após pré-requisitos.                                                          | Humano/operacional. Registro atual: 0/3 sessões completas. Zero findings em sessão não realizada não comprova zero problemas. Não iniciar cronômetro retroativo nem solicitar lançamento agora.                                               |

## Reconciliações que evitam repetir trabalho

- #518: merge `1e6602c3cf9c87e93365f088e04148e81f574531`; corpo do PR registra
  pós-merge miniapp `113503694486` e Quality `113503800860` SUCCESS.
  Esses resultados permanecem evidência daquele SHA, não da branch atual.
- #519: merge `e8850cbc9d7615283225516d5ab7eb654bdea545`, integração PostgREST
  e leitura remota `113533464845` aprovadas. Preservar filtros/fallback;
  não recriar esse reparo e não inferir RLS integral da fixture reduzida.
- #538: merge/base desta rodada. Corpo do PR certifica deploy pós-merge e
  captura PRE/disposable, mas recuperação integral BLOCKED, launcher privado
  PENDING e migration Escola NOT_RUN. Seis preflights #523 não dispensados.
- Recuperação em `comun-escola-readonly-ci-ca-recovery.md` tem progresso posterior
  à prova sintética #534: não continuar afirmando que todos os restores são
  apenas sintéticos ou que custódia/mapping jamais foram comprovados. A prova
  da cópia anterior não certifica APIs/configuração da nova cópia nem backup atual.
- A5-A4: último ciclo operacional registrado recuperou um original, mas não
  encontrou candidato publicável autorizado. Isso é bloqueio editorial seguro,
  não defeito que se fecha com mais código. Relatório histórico não é inventário
  atual completo do banco.
- Calçadas: a janela original encerrou em `2026-08-06T03:00:00.000Z` (00h BRT).
  Métricas de julho não são contagem atual. Corrigida a afirmação de janela ativa
  no escopo e painel; relatório histórico original preservado.

## Correções técnicas desta branch

1. O resumo separa `declaredReadyForFinalHumanGate` de `readyForFinalHumanGate`.
   Estados verdes, lista vazia, IDs repetidos e conjunto incompleto não
   certificam provas. Não há booleano fornecido pelo chamador que libere o gate.
2. Enquanto este componente não verifica evidências, expõe
   `domainEvidenceVerification=not_performed` e mantém prontidão efetiva falsa.
   O auditor acrescenta finding explícito se todos os estados declarados ficarem
   verdes. Não acrescenta seis duplicatas à contagem atual.
3. Um verificador real, ligado às provas revisadas e ao candidato/ambiente exatos,
   ainda precisa ser implementado/revisado antes de liberar prontidão. Esta
   proteção não é apresentada como esse verificador e não cria novo gate humano.
4. O painel explica o limite e não presume operação atual ou reabertura de Calçadas.
5. Atualização focal `sharp 0.35.4 → 0.35.5` em dependência e override, mantendo
   lockfile e versões das demais famílias. Aviso do mantenedor
   [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)
   afeta `<0.35.5` e relaciona a correção à librsvg; condições de exploração em
   Production não foram comprovadas. Sem `audit fix --force` ou upgrade major.

## Verificação e fronteira

PASS local: 95 testes Node (assets/páginas públicas/cultura/segurança/leitura
Quality/sessões humanas), 54 testes Vitest focais e 121 testes Node learning;
zero skipped nessas três execuções. TypeScript e ESLint focal passaram antes
da atualização de dependência; build final de produção (incluindo TypeScript), ESLint focal final, Prettier e
`git diff --check` PASS. O build não certifica comportamento no navegador.
Smoke nativo sharp 0.35.5/librsvg 2.63.2: raster PNG → resize/WebP e SVG sintético
→ PNG/resize/WebP passaram, dimensões corretas e EXIF ausente. Sem exploit.
`npm audit` atual: antes 11 (9 high/2 moderate/0 critical); depois 10
(8 high/2 moderate/0 critical), sharp ausente dos findings. Esses totais não
significam dez vulnerabilidades exploráveis em Production. Cadeias restantes
incluem toolchain ESLint/Tailwind e source-map-js; exigem triagem separada sem
downgrade ou upgrade major automático.

Artifact HTTP sanitizado preservado em
[comun-v1-six-domain-http-20261009.json](comun-v1-six-domain-http-20261009.json).
Não foi instalada nem encontrada engine Chromium local: confirmação de
hidratação/navegador desta branch NOT_RUN. Browser plugin não disponível;
orientação de frontend-testing foi lida, mas não se declara QA visual aprovado.
Sessão admin, aparelhos físicos, AT real, campo, conteúdo autorizado e operação
72h não foram executados. Provas de CI anteriores continuam vinculadas aos
seus SHAs. Testes locais não são aprovação global ou certificação Production.
Sem SQL remoto, exportação privada, Storage/Auth writes, migration, flags,
indexação, merge, deploy manual, divulgação pública ou convite/envio a terceiros.
O trabalho é candidato a PR, não entrega integrada nem certificado de Production.
