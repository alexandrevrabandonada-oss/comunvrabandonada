# Tijolo 47.9A4 — Grafo Cívico Navegável e Superfícies Relacionais

Fechamento técnico preparado em 1º de agosto de 2026. Este documento será
complementado após o merge com o SHA e a evidência agregada de Production. Não
constitui ensaio humano, migração integral dos sete shells ou autorização de
lançamento público.

1. **Resultado:** candidato a
   `COMUN_RELATIONAL_NAVIGATION_READY_FOR_FULL_SURFACE_MIGRATION`; emissão final
   condicionada a CI, consistência remota, merge e Production no SHA exato.
2. **Base:** `0160fa0b4884a403a02c016fc3ebc43b8dfb7c66`, `origin/main` e merge
   da PR #137 confirmados antes da implementação.
3. **Branch:** `codex/tijolo-47-9a4-grafo-civico-superficies-relacionais`.
4. **Candidate:** commit técnico
   `926107cab7de6dd72c379ed7f8d71d9043d5f31d`.
5. **PR:** [#138](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/138),
   única PR principal.
6. **Merge:** pendente dos gates remotos.
7. **Deployment:** pendente de merge e confirmação do SHA em Production.
8. **Fontes:** 16 projeções relacionais catalogadas com chave, fonte canônica,
   filtro público e lacuna; nenhuma projeção textual é promovida a fonte.
9. **Relações:** 18 cenários navegáveis formalizados, incluindo território,
   comunidade, pauta, ação, resultado, miniapp e memória.
10. **Inconsistências:** zero bloqueio estático; consistência remota somente
    leitura será exigida no push de `main` e não coleta IDs ou conteúdo privado.
11. **Contagens corrigidas:** registros públicos de Calçadas, contribuições
    aprovadas, protocolos, tarefas e publicações permanecem escopos separados;
    zero não é substituído por número editorial.
12. **Território:** índice e detalhe V2 exibem contexto, relações comprovadas e
    estado vazio acionável sem fabricar cadastro territorial.
13. **Comunidades:** detalhe V2 recebe contexto relacional; lookup público
    canônico substitui associação por texto ou seed.
14. **Pautas:** índice e detalhe V2 ligam apenas comunidade confirmada, ação,
    resultado e Calçadas disponíveis, preservando o fallback editorial canônico.
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
28. **Auditor:** produz JSON e Markdown com rota, família, finding, severidade e
    decisão; total atual: 96 achados informativos e zero bloqueio.
29. **Redirects:** nenhuma rota ou redirect foi removido; server actions de
    identificação preservam `returnTo` e a experiência selecionada.
30. **Deep links:** rotas V2 diretas, filtros e retorno são cobertos por E2E;
    fallback legado permanece disponível sem a query flag.
31. **Acessibilidade:** axe, teclado, foco, reduced motion, forced colors,
    landmarks, 320 px e landscape aprovados localmente.
32. **Performance:** build com 95 páginas estáticas e 9/9 budgets do 47.9C
    aprovados; conceitos não viraram textura pictórica no runtime.
33. **PWA:** 30/30 testes, standalone nos cinco perfis do grafo e status de
    conexão sem overlay sobre título ou CTA.
34. **No-leak:** contrato allowlisted, href interno sanitizado, consultas com
    filtros públicos e smoke HTTP sem conteúdo privado aprovados.
35. **Testes:** grafo 8/8 e 40/40; unit 407/407; jornadas 4/4 + 8/8 e 35/35;
    app shell 35/35; qualidade 1/1 + 4/4; a11y 27/27; segurança 6/6.
36. **Regressões:** `typecheck`, `lint`, `build`, core public routes, public UI,
    no-leak, jornadas, shell V2, PWA e performance verdes localmente.
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
44. **Riscos:** 162 páginas aguardam a migração integral; relações culturais
    dependem de FKs públicos reais; aparelhos e pessoas reais ainda precisam de
    ensaio; 47.8A, provider 47.9B, Calçadas e conteúdo cultural seguem paralelos.
45. **Próximo tijolo:** `47.9A5 — Migração Integral dos Sete Shells`, seguido
    por 47.9D, 47.10 e 47.11. `launch_publicly` não foi acionado.
