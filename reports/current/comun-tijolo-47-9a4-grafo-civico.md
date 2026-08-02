# Tijolo 47.9A4 — Grafo Cívico Navegável e Superfícies Relacionais

Fechamento técnico em 2 de agosto de 2026. Esta evidência não constitui ensaio
humano, migração integral dos sete shells ou autorização de lançamento público.

1. **Resultado:**
   `COMUN_RELATIONAL_NAVIGATION_READY_FOR_FULL_SURFACE_MIGRATION`.
2. **Base:** `0160fa0b4884a403a02c016fc3ebc43b8dfb7c66`, com estado e
   Production relidos antes da implementação.
3. **Branch:** principal
   `codex/tijolo-47-9a4-grafo-civico-superficies-relacionais`; correções focais
   `codex/tijolo-47-9a4-post-merge-consistency` e
   `codex/tijolo-47-9a4-post-merge-action-href`; fechamento documental
   `codex/tijolo-47-9a4-documentation-closeout`.
4. **Candidate:** implementação `926107cab7de6dd72c379ed7f8d71d9043d5f31d`;
   correção de origem de qualidade `4f075a591a0750928304df9623d613dafd6fc32f`;
   consistência/lookup `08e69c6ecf4a8c25642a6d53e1597444f836d426`;
   ação canônica `153b50a6953cd8b1395b315b8bbd777fc5765ec7`.
5. **PR:** principal
   [#138](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/138);
   focais pós-merge comprovadas
   [#139](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/139)
   e [#140](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/140).
6. **Merge:** principal `9e3618220d6e8844b87d2ee439ec4f63a208d892`;
   consistência `50c84fcdd4daa04a90c60f5081c35378ff88da0c`; runtime final
   `224617bd5b90ef549045a007e5cd5199a14f51a8`.
7. **Deployment:** Vercel Production `5709680742`, estado `success`, no SHA
   runtime final; `/api/comun/quality-status` confirmou o mesmo SHA,
   `comun-pwa-v2`, telemetria `aggregate_only` e evidência real ainda requerida.
8. **Fontes:** 16 projeções relacionais catalogadas com chave, fonte canônica,
   filtro público e lacuna; nenhuma projeção textual foi promovida a fonte.
9. **Relações:** 18 cenários navegáveis formalizados entre território,
   comunidade, pauta, ação, resultado, miniapp e memória.
10. **Inconsistências:** auditoria remota somente leitura em estado `consistent`;
    zero slug público inválido, zero comunidade textual sem correspondência e um
    warning não bloqueante: a pauta pública ainda não possui território formal.
11. **Contagens corrigidas:** 0 territórios formais públicos; 1 pauta pública;
    1 pauta pública sem território; 0 contribuições aprovadas; 0 ações públicas;
    0 resultados públicos/verificados; 1 registro publicado de Calçadas; 3 itens
    públicos do Acervo; 0 vínculos públicos de memória; 0 episódios públicos de
    Rádio. Escopos permanecem separados e zero não vira número editorial.
12. **Território:** índice e detalhe V2 exibem contexto, relações comprovadas e
    estado vazio acionável sem fabricar cadastro territorial.
13. **Comunidades:** detalhe V2 recebe contexto relacional; lookup público
    canônico substitui associação por texto ou seed.
14. **Pautas:** índice e detalhe V2 ligam apenas comunidade confirmada, ação,
    resultado e Calçadas disponíveis; o fallback canônico segue fail-closed em
    falha e cede sempre ao registro público real.
15. **Ações:** índice e detalhe V2 apresentam estado, próxima ação, pauta,
    tarefas, protocolos, respostas e resultados segundo visibilidade.
16. **Miniapps:** Calçadas ganhou contexto e rail próprios; registros do mapa
    não são chamados de relatos da pauta.
17. **Resultados:** índice e detalhe V2 distinguem resultado comprovado de
    processo ainda sem comprovação e mantêm origem navegável quando existente.
18. **Acervo:** entrada, item, coleções e identificação migrados na primeira
    onda; busca, campanha e contribuição usam progressive disclosure.
19. **Rádio:** índice, programa e episódio usam relações reais com território,
    pauta ou ação; ausência de FK resulta em ausência honesta de rail.
20. **Arte:** índice e obra V2 usam gramática cultural própria e vínculos apenas
    quando comprovados pelo registro público.
21. **App bars:** títulos contextuais substituem `COMUN / Processo comunitário`
    nas rotas V2 aninhadas; status offline fica inline e não encobre conteúdo.
22. **Context trail:** trilha narrativa reutilizada com links sanitizados,
    retorno compreensível e preservação da flag.
23. **Relation rail:** componente finito, rolável, rotulado, focável e sem
    relações privadas ou sintéticas.
24. **Empty states:** explicam o que falta, por que importa, qual é a próxima
    ação e quais rotas relacionadas continuam disponíveis.
25. **Cards:** superfícies de entidade, ação, ferramenta, resultado e memória
    permanecem semanticamente distintas; não foi criado wrapper universal.
26. **Páginas migradas:** 27 rotas compõem a primeira onda sob
    `?experiencia=app-v2`.
27. **Páginas legadas restantes:** 162 das 189 páginas inventariadas ficam fora
    da primeira onda; 82 achados administrativos estão registrados para o A5.
28. **Auditor:** JSON e Markdown registram rota, família, finding, severidade e
    decisão; 96 achados informativos, zero bloqueio, além da consistência remota
    agregada sem IDs nem conteúdo privado.
29. **Redirects:** nenhuma rota ou redirect foi removido; server actions de
    identificação preservam `returnTo` e a experiência selecionada.
30. **Deep links:** a pauta canônica respondeu HTTP 200 em Production e passou
    nos cinco viewports com app bar contextual, retorno, relações e flag; o
    fallback legado permanece disponível sem a query flag.
31. **Acessibilidade:** axe, teclado, foco, reduced motion, forced colors,
    landmarks, 320 px e landscape aprovados localmente e no CI.
32. **Performance:** build com 95 páginas estáticas e 9/9 budgets do 47.9C;
    conceitos não viraram textura pictórica no runtime.
33. **PWA:** 30/30 testes, standalone nos cinco perfis do grafo, SW V2 e status
    de conexão sem overlay sobre título ou CTA.
34. **No-leak:** contrato allowlisted, href interno sanitizado, consultas com
    filtros públicos e smoke HTTP sem conteúdo privado aprovados.
35. **Testes:** grafo 8/8 e 40/40; unit 412/412; deep link focal 5/5; jornadas
    4/4 + 8/8 e 35/35; app shell 35/35; qualidade 1/1 + 4/4; a11y 27/27;
    segurança 6/6.
36. **Regressões:** `typecheck`, `lint`, `build`, core public routes, public UI,
    no-leak, jornadas, shell V2, PWA e performance verdes; pós-merge final:
    [grafo `30725877730`](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30725877730),
    [jornadas `30725877764`](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30725877764)
    e [qualidade `30725877733`](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30725877733)
    aprovados. O grafo precisou de um rerun focal após `SIGSEGV` transitório do
    Chromium; no attempt 2, 40/40 passaram no mesmo SHA e sem mudança de código.
37. **Feature flag:** `?experiencia=app-v2` é reversível; versão anterior e
    deep links foram preservados.
38. **47.9A:** permanece
    `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`; ensaio humano
    não executado nem declarado.
39. **47.9B:** permanece
    `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`.
40. **47.9C:** permanece
    `COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`, sem promoção a
    GREEN.
41. **security_resilience:** permanece bloqueado por redundância durável.
42. **miniapps:** permanece `in_progress`.
43. **archive_radio_art:** permanece `evidence_required`.
44. **Riscos:** 162 páginas aguardam migração integral; relações culturais
    dependem de FKs públicos reais; a pauta pública segue sem território formal;
    aparelhos e pessoas reais ainda precisam de ensaio; 47.8A, provider 47.9B,
    Calçadas e conteúdo cultural real seguem paralelos.
45. **Próximo tijolo:** `47.9A5 — Migração Integral dos Sete Shells`, seguido
    por 47.9D, 47.10 e 47.11. `launch_publicly` não foi acionado.
