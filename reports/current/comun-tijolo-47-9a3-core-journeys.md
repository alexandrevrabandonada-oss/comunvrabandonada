# TIJOLO 47.9A3 — Fluxos Centrais Streamlined

Relatório técnico de candidato. Este documento não contém resultado de ensaio humano, conteúdo privado, identificadores pessoais, consultas, cookies, sessões ou screenshots privados.

1. **Resultado terminal.** Candidato técnico a `COMUN_CORE_JOURNEYS_STREAMLINED_READY_FOR_HUMAN_REHEARSAL`; a classificação terminal depende de CI, merge, Production e ensaio remoto verdes. Não é `GREEN`.
2. **Base.** `8f0334258d176d9dee1789f1dd2883d4c3704363`, `main` que contém a PR #136 do App Shell V2.
3. **Branch.** `codex/tijolo-47-9a3-fluxos-centrais-streamlined`.
4. **Candidate.** Commit focal desta branch, registrado na PR principal.
5. **PR.** Uma única PR principal; número e URL ficam registrados no GitHub.
6. **Merge.** Obrigatoriamente após todos os checks requeridos verdes.
7. **Deployment.** Workflow pós-merge espera o SHA exato em `https://comunsocial.online/api/comun/quality-status` antes do ensaio.
8. **Jornadas auditadas.** Dezoito fluxos reais, do encontro de pauta até correção e retirada, catalogados em `scripts/journeys/catalog.mjs` e no relatório de auditoria.
9. **Passos antes/depois.** Contagem estrutural agregada de telas: 61 → 37; redução orientadora, sem alegação de compreensão por pessoas.
10. **Roots.** Início = continuidade; Explorar = descoberta; Participar = início de ação; Caixa = comunicação acionável; Minha área = histórico, vínculos e configurações.
11. **Início.** Prioriza somente estados explícitos; quando não há pendência, oferece começo neutro sem inventar urgência, feed ou personalização comportamental.
12. **Explorar.** Busca compacta, chips, filtros server-side e recorte preservado; Rádio e Arte entram no catálogo e filtro inválido produz estado semântico recuperável.
13. **Participar.** Painel direto, allowlisted, agrupado em linguagem comum, com ações frequentes primeiro, progressive disclosure e zero mutation.
14. **Caixa.** Grupos funcionais ação/atualização/decisão/resultado/convite/encerrado, origem direta, leitura explícita, desfazer e arquivo/histórico.
15. **Minha área.** Resumo e ativos primeiro; participações, comunidades, tarefas, acompanhamentos, resultados, cultura e configurações sem criar uma segunda Caixa.
16. **Comunidades.** A primeira tela V2 funciona como casa organizativa: identidade, propósito, território/tema, vínculo, atividade, ação principal, pautas e memória em divulgação progressiva.
17. **Pautas.** Estado, acontecimento e uma ação principal precedem detalhes; participação preserva o contexto e retorna à confirmação canônica.
18. **Miniapps.** Calçadas abre a ferramenta/estado relevante diretamente; a página institucional continua disponível como fallback e deep link.
19. **Confirmações.** Rota contextual aninhada informa registro, privacidade, revisão, próximo passo, acompanhamento, retorno nomeado e correção/retirada; sem linha de progresso falsa.
20. **Acompanhamento.** Onze estados públicos possuem descrição e próxima ação; estados internos desconhecidos caem em apresentação segura.
21. **Resultados.** Card canônico distingue atividade, resposta, resultado verificado e impacto não comprovado; inclui evidência, origem, papel verificador, limites e reabertura quando aplicáveis.
22. **Memória.** Resultado liga à memória relacionada sem tratar impacto como post genérico.
23. **Formulários.** Contexto conhecido é reaproveitado; login explica necessidade da conta; nenhum payload privado é colocado na query; mutations existentes foram preservadas.
24. **Rotas intermediárias.** `/comun/participar` é fallback/sem JavaScript/ajuda; `/comun/acompanhar` é destino real; `/comun/projetos` e `/comun/campo` permanecem por compatibilidade; índices de pautas e ações seguem como destinos reais.
25. **Redirects.** Somente o piloto V2 usa a confirmação aninhada; sem a flag, a confirmação nova volta ao fluxo anterior. Queries seguras são preservadas e não há loop.
26. **Deep links.** Nenhuma rota foi apagada; o inventário registra 189 páginas em `/comun` e 190 no App Router total.
27. **returnTo.** Prioridade canônica: origem explícita allowlisted, retorno salvo, entidade canônica e root adequada; URL externa e rota administrativa são rejeitadas.
28. **Autenticação.** Login, cadastro e onboarding preservam intenção mínima, origem, recorte e flag; nenhuma informação já conhecida precisa ser escolhida novamente.
29. **Sessão expirada.** O retorno seguro e a etapa são mantidos; contexto ausente, adulterado ou vencido cai no fallback canônico.
30. **Estados.** Loading, empty, offline, reconnecting, error, permission denied, session expired, blocked, awaiting person/institution, completed, withdrawn e archived mantêm explicação, ação, retorno e anúncio acessível.
31. **Métricas técnicas.** Telas 61→37; ações repetidas 7→0; retornos quebrados 4→0; contextos perdidos 3→0; autenticações sem retorno 3→0; confirmações sem tracking 4→0; mensagens sem origem 2→0; CTAs concorrentes 5→0; becos 2→0.
32. **Matriz negativa.** Testes cobrem `returnTo` externo/admin, slug adulterado, contexto expirado/impossível, sessão, filtro inválido, confirmação sem item e fronteira de conteúdo privado.
33. **Acessibilidade.** Axe nas jornadas passou em cinco viewports; App Shell cobre teclado, foco, reflow, 320 px, landscape, reduced motion e forced colors. Ensaio com tecnologia assistiva real continua pendente.
34. **Regressão de qualidade.** Contratos do 47.9C permanecem; nenhuma meta foi relaxada. O workflow repete qualidade, PWA e performance na PR e pós-merge.
35. **PWA.** Manifest, service worker, offline honesto, cache privado fora do escopo e limpeza no logout passaram em 30/30 testes locais.
36. **Performance.** Budgets passaram nos nove viewports; o caso 360×640 foi repetido isoladamente após um esgotamento de socket do host e passou sem mudança de budget.
37. **Fallback da IA.** A descoberta conserva fallback semântico e filtros server-side quando o provider semântico está indisponível; 47.9B não é promovido.
38. **No-leak.** Artefatos do workflow são JSON agregados e sanitizados; no-leak remoto é gate pós-merge.
39. **Ensaio.** E2E focal: 35/35 jornadas e 35/35 App Shell V2; nenhum resultado humano é inferido.
40. **Cleanup.** Fixtures e processos privados pertencem ao ensaio controlado; o workflow coleta apenas agregados e executa cleanup antes da classificação.
41. **Feature flag.** O piloto amplia exclusivamente `?experiencia=app-v2`; sem a flag, a árvore anterior permanece e nenhum dado muda.
42. **Status do 47.9A.** `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`, sem promoção a `GREEN`.
43. **Status do 47.9B.** `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`.
44. **Status do 47.9C.** `COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`, sem promoção a `GREEN`.
45. **security_resilience.** Bloqueado pela ausência de redundância durável; 47.8A permanece em paralelo.
46. **miniapps.** `in_progress`; Calçadas continua em fechamento paralelo.
47. **archive_radio_art.** `evidence_required`; conteúdo cultural real continua em paralelo.
48. **Domínios formais.** Quatro domínios permanecem verdes; este tijolo não altera a classificação formal nem aciona `launch_publicly`.
49. **Riscos.** Restam validação humana, aparelhos e tecnologia assistiva reais, provider do 47.9B, redundância durável, fechamento das Calçadas e conteúdo cultural real.
50. **Próximo tijolo.** `47.9D — Ensaio humano, aparelhos reais e consolidação visual`.

Resultado humano: **pendente**. `launch_publicly`: **não acionado**.
