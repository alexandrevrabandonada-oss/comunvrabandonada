# COMUN — estado local da V1, 10/09/2026

**O candidato local está validado nos gates técnicos; lançamento e integração permanecem bloqueados.** SHA técnico: 4001985e25e1858a056fcd6289d93d1149748e1a. Main reconsultada: 1387e1bcecdc4147bb5dad41aa7d541ec97b1497. Nenhuma inspeção de Production.

No ambiente local, a pessoa consegue abrir e compreender as entradas de Pautas, Comunidades, Participação, Calçadas, Acervo, Rádio e Segurança. O ciclo real de contribuir, receber revisão/devolutiva, acompanhar resultado e retirar conteúdo ainda não foi comprovado com Auth/Postgres/Storage nem com pessoas consentidas. Não há autorização de lançamento.

Corrigimos três problemas demonstrados: decisões de build que mudavam com a ordem dos arquivos; auditor que confundia atributos/scripts com conteúdo renderizado e aceitava assets inválidos; experiência explicitamente sintética de Comunidades aparecendo na lista pública. A fixture foi preservada, com origem explícita e exclusão nos getters públicos. Nenhuma rota, SP-1 ou nova função do Observatório.

**LOCAL_PASS:** lint, TypeScript, build, 1.350 testes unitários, 28 testes CI, 23 cenários de navegador, 15 testes DOM/assets e FFmpeg sintético em memória. Dez cenários separados reproduzem defeitos do auditor antigo, sem aprová-los. A primeira execução de navegador falhou em métricas locais; alinhado hostname/baseURL, a mesma suíte passou sem enfraquecer controles. npm audit: zero alertas no lock do candidato na consulta, contra 11 na main; não é certificação permanente.

**BLOCKED:** Docker não respondeu a duas consultas limitadas a 15s. Laboratório preparado com 63 migrations verificadas, sem LAB_READY. Auth, RLS, Storage, concorrência, retomada e retirada durante processamento continuam NOT_RUN. O harness existente está incluído, com lacunas explícitas para disputa de publicação e worker após retirada. Pacote externo M0/verify-package.py não localizado; a reprodução própria não o substitui.

Auditoria HTTP local: oito rotas válidas; nove pendências — Observatório desligado, robots/sitemap ausentes e seis domínios sem prova operacional. **Os 12 achados históricos continuam abertos**: não transferimos resultados locais para o ambiente remoto. Closeout de Calçadas permanece sem evidência terminal; gate humano 0/3. Conteúdo real autorizado, moderador/substituto e sessões consentidas não foram inventados.

Próxima menor entrega: disponibilizar Docker isolado e executar o harness com fixtures sintéticas; em paralelo, obter closeout anterior e preencher o roteiro canônico de três sessões e curadoria com direitos. PR #434/SP-0 permanece documental e independente. Árvores originais e pacote anterior preservados. Sem push, PR novo, merge, deploy, Preview ou acesso a Production.

[12 achados e próximas provas](M0-MATRIZ-LOCAL-20260910.md) · [Comandos, falhas e reprodução](m0-r1-20260910/REPRODUCE.md) · [Preparação do piloto e conteúdo](M0-PILOTO-E-CONTEUDO-20260910.md) · [Proveniência](m0-r1-20260910/provenance.json). SHA final, tree, bundle e checksums ficam no manifesto externo do pacote local.
