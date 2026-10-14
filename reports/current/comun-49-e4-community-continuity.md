# 49-E4 — continuidade na descoberta de comunidades

Base: main `3694710f3b3b1d26031c7c87c52826798a88dbea`, #544 integrado.

## Comportamento candidato

A lista legada perdia `experiencia=legacy` ao enviar filtros, limpar pelo
formulário e abrir um cartão. Esses três caminhos agora preservam a experiência
pelo helper existente e por um campo oculto GET. Não há nova capacidade de
organização, vínculo, progresso ou escrita de dados.

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
- PENDING: Preview do SHA candidato e gates remotos; nenhuma aprovação de #544
  foi transferida para este candidato.

Os casos novos exercitam submit por teclado, resultado vazio, limpar e contratos
dos links para comunidades, nos modos canônico/legacy com e sem JavaScript.
Não provam banco, Auth, criação de núcleos ou interação em aparelhos reais.

## Limites e próximo passo

Nenhuma migration, flag, indexação, segredo ou dado Production foi alterado.
Escola #523 e recuperação #542 seguem independentes. Integração depende dos
gates aplicáveis no SHA exato e certificação pós-merge. A V1 não está concluída.
