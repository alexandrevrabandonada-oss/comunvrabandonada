# Estado do COMUN — Sprint 21 — Fotografias históricas

Data: 2026-07-14

## Resultado

A fundação do Acervo Vivo agora recebe uma fotografia sem conta, preserva o original no R2 privado, valida o arquivo real e seu SHA-256, detecta duplicidade exata e permite que a curadoria gere thumbnail WebP (até 480 px) e versão de exibição WebP (até 1600 px) no bucket público. Publicação continua humana e bloqueada sem direitos, fonte, crédito, texto alternativo, original privado e derivados aprovados.

## Reconciliação

Os cinco registros sem objeto eram fixtures de smokes antigos. O script de reconciliação foi executado primeiro em dry-run e depois com confirmação explícita. Os cinco registros foram removidos com auditoria sanitizada; os itens foram preservados. Nenhum item publicado permaneceu apontando para asset inexistente. Resultado detalhado em `reports/acervo-assets-ausentes-reconciliacao-2026-07-14.json`.

## Implementação

- Migration remota aplicada para contribuições, vínculos de assets, sugestões e pedidos de correção/retirada, com RLS e grants explícitos ao `service_role`.
- Fluxo público em `/comun/acervo/contribuir`, com honeypot, desafio leve, limites 3/hora, 10/dia e 10 URLs/hora, validação server-side e uma foto por protocolo.
- Upload direto assinado para o bucket privado; original nunca é usado como mídia pública.
- Fila e detalhe protegidos em `/comun/admin/acervo/contribuicoes`; fila moderada de sugestões em `/comun/admin/acervo/sugestoes`.
- Helper `generateHistoricalPhotoDerivatives(assetId)` e fallback operacional por script com Sharp, orientação automática e remoção de metadados na saída.
- Galeria paginada (24 itens), filtros compartilháveis e links por lugar, bairro e década; sem feed infinito.
- Formulário “Ajude a completar esta memória”; toda sugestão nasce `pending` e nunca altera publicação automaticamente.
- Fluxo público de correção, crédito e retirada em `/comun/acervo/direitos-e-remocao`, com contatos privados restritos ao servidor.
- Manifesto de backup, matriz RLS, documentação operacional e página de segurança atualizados.

## Segurança e direitos

Originais ficam privados; derivados só entram no bucket público após geração e aprovação. URLs assinadas, object keys, contatos e textos privados integrais não são gravados na auditoria. Informações sobre pessoas recebem risco reforçado. A despublicação registra evento, mas preserva o original privado enquanto permitido. O domínio público de mídia continua temporariamente em `r2.dev`; falta um domínio controlado para a arquitetura final.

## Verificação

- `npm ci`: passou.
- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run test:unit`: 6/6 passaram.
- `npm run build` e `npm run verify`: passaram com Next.js 16.2.10.
- `npx supabase db lint --linked`: passou sem erros.
- `npm run audit:rls-matrix`: `RLS_MATRIX_OK`.
- `npm audit --audit-level=high`: passou no limiar; 2 vulnerabilidades moderadas transitivas do PostCSS/Next permanecem. O reparo automático proposto exige alteração incompatível e não foi forçado.

## Custos e riscos

Não houve contratação adicional. A solução usa R2, Supabase e funções já provisionados; os custos variam com armazenamento, egress e processamento Sharp. Imagens muito grandes podem ultrapassar limites de memória/tempo da função, por isso existe fallback administrativo seguro. Permanecem como riscos: domínio `r2.dev` temporário, moderação manual crescente, ausência de comparação visual (somente duplicidade SHA-256) e dependência do limite de execução da Vercel.

## Deploy e smokes

Preencher após o deploy de produção. Os smokes reais exigem `RUN_REAL_R2_SMOKE=true` e credenciais de produção carregadas sem versionamento.

## Próximo tijolo recomendado

Implantar processamento assíncrono idempotente de derivados, com fila, tentativas, métricas e dead-letter; em seguida configurar domínio próprio de mídia e política de retenção/remoção jurídica.
