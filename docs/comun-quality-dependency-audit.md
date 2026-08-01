# Dependências do 47.9C

Data: 31/07/2026.

## PostCSS

O baseline continha PostCSS 8.5.12 como dependência direta e override. O advisory alto afeta o carregamento automático de source maps e permite leitura de arquivo no contexto de build quando CSS não confiável controla o caminho. No COMUN, PostCSS/Tailwind executam no build; não são código servido no runtime do navegador. Ainda assim, runner e workspace são ativos protegidos.

A correção 8.5.25 é patch compatível dentro da mesma linha 8.5, aplicada tanto à dependência quanto ao override. Não foi executado o `npm audit fix` que sugeria downgrade incompatível do Next. O gate completo de build, Tailwind, unitários e E2E decide a promoção.

Depois da atualização, os findings altos restantes pertencem à cadeia de desenvolvimento do ESLint/minimatch. Eles são build/lint-only e a remediação automática proposta exige mudança incompatível; ficam registrados, sem fingir que o audit inteiro está verde.

## Regra

Dependências novas ou atualizadas não podem aumentar dívida. Correção breaking exige tijolo focal, comparação e regressão completa; não autoriza salto destrutivo neste trabalho.
