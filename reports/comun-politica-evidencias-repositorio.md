# Política de evidências no repositório

## Entra no Git

- relatório canônico e decisão de readiness;
- templates de gate humano;
- manifestos, hashes, licenças e proveniência;
- no máximo uma imagem mobile e uma desktop por gate canônico, quando a imagem acrescentar evidência não expressa pelo teste;
- contact sheet que substitua, de forma legível, uma série necessária.

## Vira artifact de CI

- screenshots e vídeos gerados por Playwright;
- traces, HTML report, `test-results` e comparações visuais;
- logs de reset, performance e produção-like reproduzíveis;
- matrizes completas de viewports.

Retenção recomendada: 30 dias para execução verde e 90 dias para falha ligada a release candidate.

## Fica somente local

- fontes cartográficas brutas, caches e diretórios de build;
- sessões, storage states, dumps, originais, dados pessoais e fotos reais;
- logs exploratórios e arquivos temporários.

## Nomenclatura

`<gate>-<superficie>-<viewport>-<sha-curto>.<ext>`. Evidências regeneráveis devem ser gravadas em `test-results/evidence`, nunca diretamente em `reports/screenshots` durante a execução normal.

## Critério de limpeza

Uma evidência é removível quando é superseded, duplicada por viewport, reproduzível por suíte documentada ou coberta por contact sheet equivalente. Licença, privacidade, hash e decisões humanas nunca são descartados com a limpeza visual.
