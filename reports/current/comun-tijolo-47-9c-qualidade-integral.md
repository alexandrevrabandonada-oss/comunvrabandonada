# Tijolo 47.9C — qualidade integral

Data do candidato: 31/07/2026. Base: `47d0925a80b494f1fc60cb3a8709d275a8e71ff1`. Branch: `codex/tijolo-47-9c-qualidade-integral`.

## Classificação

Resultado candidato: `COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`, condicionado a CI, transporte focal da migration e Production verdes. Não é `GREEN`: Android físico popular, segunda plataforma física, tecnologia assistiva real e amostra de campo suficiente ainda não foram ensaiados. `launch_publicly` não foi acionado.

## Baseline, acessibilidade e PWA

O baseline de Production está em `comun-quality-performance-baseline.json`. Ele encontrou ajuda 404, hidratação divergente na busca, LCP sintético isolado de 6,8 s na busca, Calçadas com cerca de 448 kB de JavaScript e três long tasks, limpeza incompleta de cache no logout e PostCSS 8.5.12 vulnerável no caminho de build.

O alvo formal é WCAG 2.2 AA. O laboratório cobriu Axe, landmarks, heading único, labels, teclado, foco visível, forced colors, fonte a 200%, reflow a 320 CSS px, redução de movimento e autenticação compatível com colagem/autocomplete. Foram usados nove viewports entre 320×568 e 1440×900. Isso não equivale a TalkBack, VoiceOver ou NVDA reais.

O manifest tem identidade e escopo canônicos. O service worker `comun-pwa-v2` só reutiliza páginas públicas allowlisted, sem query, `Set-Cookie`, `private` ou `no-store`; nunca intercepta mutações. Admin, conta, Inbox, autenticação, confirmações, APIs e buscas com query ficam fora do cache. Logout remove todos os caches de conteúdo e preserva somente o shell seguro. Offline não promete envio, upload ou dado privado recente.

## Performance e observabilidade

Os budgets são separados em `simple`, `visual`, `rich` e `media`. O gate final usa `next build` + `next start`, contextos frios e enforcement. Em 390×844, por exemplo, a Home mediu 160,2 kB JS/17 requests/LCP 288 ms; busca 160,9 kB/14/LCP 208 ms; Calçadas inicial 167,4 kB/24/LCP 200 ms. Todos os oito percursos passaram nos nove viewports. São dados sintéticos locais, não Web Vitals de campo.

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
- reset integral, RLS e jornadas autenticadas dependentes do Supabase local: delegados ao runner descartável do CI porque o daemon Docker local estava indisponível; não foram declarados como passe local.

O audit de dependências reduziu findings altos de 10 para 4 ao atualizar PostCSS para 8.5.25. Os quatro restantes pertencem ao toolchain ESLint de desenvolvimento; não foi aplicado downgrade nem `audit fix` destrutivo.

## Estados preservados e próximos gates

- `quality_performance=evidence_required` até aparelho/AT/campo reais;
- 47.9A: `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`;
- 47.9B: `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`;
- `security_resilience=blocked` por recovery point durável e cópia secundária de Storage;
- `miniapps=in_progress`;
- `archive_radio_art=evidence_required`;
- quatro domínios permanecem verdes; nenhum foi promovido artificialmente.

Próximas ações: concluir o lane remoto deste candidato, ensaiar Android popular e uma segunda plataforma física, executar TalkBack/VoiceOver ou NVDA real, acumular amostra suficiente de campo e então seguir para 47.10 sem antecipar `launch_publicly`.
