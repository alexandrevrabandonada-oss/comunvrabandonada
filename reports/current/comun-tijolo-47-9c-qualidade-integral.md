# Tijolo 47.9C — qualidade integral

Fechado em 01/08/2026. Base: `47d0925a80b494f1fc60cb3a8709d275a8e71ff1`. Candidato principal: `88238d2108fe8b4e4b2a2127703302fa012f2953`. Branch principal: `codex/tijolo-47-9c-qualidade-integral`. PR principal: `#131`, merge `ff38327d703a0eb83c39d08b9ed3ae176239fc1d`. Reparos focais: PR `#132`, candidato `71261a09f3f65fc203b322a945586e8b975339a9`, merge `a118d7006da2f5358a6b65c48cd803a04ffb6fbd`; PR `#134`, candidato `a45a88a86912ca1a58951246f44b9dd2f4b2e6ea`, merge funcional final `0aad72c96d8b200e0f682f542723dc0a6de8333e`. O fechamento remoto intermediário foi preservado no PR documental `#133`, merge `d47e5de3e15780d20b64985ca123bdadaedf4f05`.

## Classificação

Resultado: `COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`. CI, transporte focal idempotente, Production, pós-merge e artifacts sanitizados estão verdes. Não é `GREEN`: Android físico popular, segunda plataforma física, tecnologia assistiva real e amostra de campo suficiente ainda não foram ensaiados. `launch_publicly` não foi acionado.

## Baseline, acessibilidade e PWA

O baseline de Production está em `comun-quality-performance-baseline.json`. Ele encontrou ajuda 404, hidratação divergente na busca, LCP sintético isolado de 6,8 s na busca, Calçadas com cerca de 448 kB de JavaScript e três long tasks, limpeza incompleta de cache no logout e PostCSS 8.5.12 vulnerável no caminho de build.

O alvo formal é WCAG 2.2 AA. O laboratório cobriu Axe, landmarks, heading único, labels, teclado, foco visível, forced colors, fonte a 200%, reflow a 320 CSS px, redução de movimento e autenticação compatível com colagem/autocomplete. Foram usados nove viewports entre 320×568 e 1440×900. Isso não equivale a TalkBack, VoiceOver ou NVDA reais.

O manifest tem identidade e escopo canônicos. O service worker `comun-pwa-v3` só reutiliza páginas públicas allowlisted, sem query, `Set-Cookie`, `private` ou `no-store`; nunca intercepta mutações. Admin, conta, Inbox, autenticação, confirmações, APIs e buscas com query ficam fora do cache. Logout remove todos os caches de conteúdo e preserva somente o shell seguro. Offline não promete envio, upload ou dado privado recente.

## Performance e observabilidade

Os budgets são separados em `simple`, `visual`, `rich` e `media`. O gate final usa `next build` + `next start`, contextos frios e enforcement. Na rodada final em 390×844, a Home mediu 18,7 kB HTML/168,3 kB JS/10,9 kB CSS/17 requests/LCP 196 ms; busca 169,1 kB JS/14 requests/LCP 124 ms; Calçadas inicial 176,4 kB JS/24 requests/LCP 148 ms. Imagens e fontes marcaram 0 kB nessas fixtures isoladas, agora como valor medido por CDP e sujeito a budget, não como ausência presumida. Todos os oito percursos passaram nos nove viewports. São dados sintéticos de laboratório, não Web Vitals de campo.

Calçadas agora começa na lista funcional; MapLibre e PMTiles só carregam após a pessoa escolher “Mapa” ou abrir `?vista=mapa`. A navegação global e os cards da Rádio não fazem prefetch indiscriminado. A busca usa primeiro a projeção lexical e preserva `unifiedPublicSearch` como fallback. Datas públicas usam o fuso explícito `America/Sao_Paulo`, eliminando divergência de hidratação.

Web Vitals são amostrados em 20% e agregados por hora, métrica, classe de rota, mobile/desktop, versão, faixa e rating. Não há URL, slug, query, texto de busca, IP, pessoa, sessão ou evento individual. A Central mostra p75 aproximado, idade, cobertura e “amostra insuficiente”. Campo só fica pronto com pelo menos 75 amostras para cada combinação LCP/INP/CLS × mobile/desktop.

## Evidência automatizada

- unit: 71 arquivos e 381 testes verdes;
- contratos 47.9A, 47.9B, segurança e qualidade verdes;
- PWA: 30/30;
- acessibilidade focal: 27/27;
- performance de release: 9/9 projetos, 72 superfícies medidas;
- rede: 10 passes e oito skips intencionais; 3G lento roda somente no perfil Android de baixa capacidade;
- carga pública sintética: 25, 50, 100, 500 e 1.000 documentos;
- build, typecheck, lint, Prettier focal e `git diff --check`: verdes;
- reset integral, RLS e jornadas autenticadas dependentes do Supabase local: verdes no runner descartável do CI; o daemon Docker local estava indisponível e isso não foi declarado como passe local;
- PR principal verde no run `30683251675`; reparo de isolamento verde nos runs `30685312412` e `30685312409`; reparo de envelope verde nos runs `30687001201` e `30687001276`;
- pós-merge funcional final verde no run `30688027449`: SHA de Production, PWA, acessibilidade, performance, carga, rede, autenticação negativa, no-leak, coleta e classificação;
- deployment Production `5702316082`, `READY`, servindo `0aad72c96d8b200e0f682f542723dc0a6de8333e`.

A primeira execução pós-merge registrou um crash isolado do Chromium no ensaio PWA. A repetição controlada, feita somente após classificar o `SIGSEGV`, passou PWA e WCAG, mas revelou que a performance herdava a URL de Production e misturava laboratório com rede/conteúdo publicado. O PR focal `#132` corrigiu o harness para medir sempre o `next start` isolado, preservou todos os budgets originais e adicionou contrato antirregressão. O pós-merge desse reparo passou sem retry adicional.

A releitura terminal do pedido encontrou que imagens e fontes tinham budgets definidos, porém ainda não eram termos do enforcement, e que HTML, TTFB, FCP, interação aproximada e erros de console não apareciam no envelope. O PR `#134` fechou essa lacuna com contagem CDP sem URLs, status HTTP obrigatório, classes de erro sanitizadas e telemetria desativada somente no build de laboratório. Os budgets não foram relaxados. A classificação continuou `READY_FOR_REAL_DEVICE_REHEARSAL` depois do novo CI e pós-merge integrais.

O audit de dependências reduziu findings altos de 10 para 4 ao atualizar PostCSS para 8.5.25. Os quatro restantes pertencem ao toolchain ESLint de desenvolvimento; não foi aplicado downgrade nem `audit fix` destrutivo.

## Estados preservados e próximos gates

- `quality_performance=evidence_required` até aparelho/AT/campo reais;
- 47.9A: `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`;
- 47.9B: `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`;
- `security_resilience=blocked` por recovery point durável e cópia secundária de Storage;
- `miniapps=in_progress`;
- `archive_radio_art=evidence_required`;
- quatro domínios permanecem verdes; nenhum foi promovido artificialmente.

Próximas ações: ensaiar Android popular e uma segunda plataforma física, executar TalkBack/VoiceOver ou NVDA real, acumular amostra suficiente de campo e então seguir para 47.10 sem antecipar `launch_publicly`. A pista 47.8A continua bloqueando o lançamento por redundância durável de banco e Storage.
