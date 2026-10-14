# 49-E4 — continuidade na descoberta de comunidades

Base: main `3694710f3b3b1d26031c7c87c52826798a88dbea`, #544 integrado.

## Comportamento candidato

A lista legada perdia `experiencia=legacy` ao enviar filtros, limpar pelo
formulário e abrir um cartão. Esses três caminhos agora preservam a experiência
pelo helper existente e por um campo oculto GET. Não há nova capacidade de
organização, vínculo, progresso ou escrita de dados.

O primeiro candidato remoto `ddbb4118` falhou em quatro casos sem JavaScript
na lane focal `38499390773`: snapshot visível limitado a “Carregando experiência…”,
timeout no preenchimento. Quatorze casos da mesma execução passaram. Esta falha
é de produto, não de infraestrutura, e permanece registrada.

A lista pública agora opta pelo `publicReadOnlyFallback` existente em ambos
os modos. O fallback mostra somente os mesmos filhos públicos renderizados no
servidor. A shell aceita uma classe opcional somente para o fallback público;
a lista canônica define fundo claro e texto escuro para preservar contraste
sem a shell hidratada. Nenhum painel privado opta pelo fallback. Os quatro
casos que falharam permanecem obrigatórios, agora também com Axe sem JavaScript.

Quatro verificações locais do HTML HTTP (lista/vazia, canônica/legacy) passaram
no primeiro candidato; não provaram o conteúdo visível no navegador sem JavaScript,
pois o streaming pode conter conteúdo oculto. A prova de navegador é obrigatória.

## Evidências locais

- PASS: ESLint focal, TypeScript, build Next.js e nove testes existentes dos
  helpers de experiência/comunidades.
- PASS: descoberta de 28 casos Playwright novos (quatro cenários em sete
  viewports). Descoberta não é execução nem aprovação desses casos.
- BLOCKED: instalação Chromium recebeu arquivo inválido/truncado do CDN.
  O instalador esgotou suas tentativas automáticas; sem reexecução manual.
- NOT_RUN: execução visual local, screenshots, aparelhos reais e leitores
  de tela humanos. Browser plugin not available; Playwright foi escolhido
  para validação, mas não pôde iniciar navegador local.
- PENDING: novo Preview e gates remotos após correção do fallback; resultados
  do candidato anterior não são aprovação do novo SHA.

Os casos novos exercitam submit por teclado, resultado vazio, limpar e contratos
dos links para comunidades, nos modos canônico/legacy com e sem JavaScript.
Não provam banco, Auth, criação de núcleos ou interação em aparelhos reais.

## Limites e próximo passo

Nenhuma migration, flag, indexação, segredo ou dado Production foi alterado.
Escola #523 e recuperação #542 seguem independentes. Integração depende dos
gates aplicáveis no SHA exato e certificação pós-merge. A V1 não está concluída.
