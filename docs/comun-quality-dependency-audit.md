# Auditoria de dependências do COMUN

## Reavaliação de 02/10/2026 — R6

O `npm audit --json` do lockfile integrado pelo PR #484 encontrou 11 pacotes sinalizados: 2 críticos, 5 altos, 3 moderados e 1 baixo. O diagnóstico histórico de julho abaixo não descreve mais a exposição atual: há dependências de runtime, além das ferramentas de desenvolvimento.

Atualizações compatíveis propostas neste pacote:

| Pacote | Antes | Depois | Uso / validação |
| --- | --- | --- | --- |
| Next.js / eslint-config-next | 16.2.11 | 16.3.8 | Framework e lint; compilação de produção e gates de Preview |
| sharp / override | 0.35.3 | 0.35.4 | Processamento de imagens do Acervo, Arte e relatos; testes existentes de imagens e derivadas |
| Vitest | 4.1.10 | 4.1.11 | Ferramenta de testes; atualiza também o mocker |
| brace-expansion / override | 1.1.16 | 1.1.21 | Cadeia transitiva de ferramentas |
| baseline-browser-mapping | Lockfile anterior | 2.11.27 | Resolução compatível, sem trocar dependência direta |
| browserslist | Lockfile anterior | 4.29.3 | Resolução compatível |
| js-yaml | Lockfile anterior | 4.3.2 | Resolução compatível |
| nanoid | Lockfile anterior | 3.3.19 | Resolução compatível da linha 3 |
| postcss-selector-parser | Lockfile anterior | 6.1.4 | Resolução compatível da linha 6 |

Após `npm install --ignore-scripts` e atualização direcionada dos transitivos, o audit local passou a **1 crítico, 0 altos, 0 moderados e 0 baixos**. O achado residual é MapLibre GL 5.14.0. O exit code 1 do audit continua esperado e não foi transformado em um resultado verde.

### Alcance e achado residual

- Next.js utiliza `next/image` em superfícies públicas. Os avisos atuais abrangem otimização AVIF/libheif e `next/og`; a busca em `app`, `components` e `lib` não encontrou uso de `ImageResponse` ou `next/og`. A ausência dessa chamada não dispensa a atualização do framework.
- sharp é importado em processamento real de imagens e confirmação de submissões; não é uma dependência apenas de build.
- MapLibre é carregado nos mapas de Calçadas, Observatório de Calçadas e Território. O [GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579) afeta versões até 6.4.0 e foi corrigido em 6.4.1. A exploração envolve HTML de atribuições não confiáveis e a sanitização de atributos. As atribuições customizadas observadas são constantes versionadas, mas o provedor permite configurar URL de estilo. Isso não prova ausência de exposição em todos os estilos e não encerra o achado.
- A correção oferecida pelo audit exige MapLibre 6.x, mudança de versão major. Deve ser feita em pacote focal com revisão de APIs, tipos, PMTiles, controles, marcadores, navegação e regressão dos três consumidores. Segurança/resiliência permanece incompleta até a correção e sua evidência; não se aceita ignorar esse advisory.

Fontes primárias: [Next AVIF/libheif](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [Next ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [sharp/libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) e [guia oficial do Next 16](https://nextjs.org/docs/app/guides/upgrading/version-16).

### Validação local e limites

Lint e typecheck passaram. Vitest passou em 237 arquivos / 1.326 testes, incluindo testes existentes que usam sharp para rejeitar imagens divergentes e gerar derivadas. Build de produção do Next 16.3.8 passou. O arquivo `next-env.d.ts` recebeu a referência de tipos de parâmetros raiz gerada pelo framework.

Esses resultados são locais. Integração, Preview e produção deste pacote dependem dos checks do PR e de verificação do deploy correspondente. Audit não comprova ausência de falhas de aplicação, de configuração ou de recuperação. As lacunas de backup, ensaio humano, conteúdo autorizado e piloto permanecem abertas.

## Histórico do 47.9C

Data: 31/07/2026.

## PostCSS

O baseline continha PostCSS 8.5.12 como dependência direta e override. O advisory alto afeta o carregamento automático de source maps e permite leitura de arquivo no contexto de build quando CSS não confiável controla o caminho. No COMUN, PostCSS/Tailwind executam no build; não são código servido no runtime do navegador. Ainda assim, runner e workspace são ativos protegidos.

A correção 8.5.25 é patch compatível dentro da mesma linha 8.5, aplicada tanto à dependência quanto ao override. Não foi executado o `npm audit fix` que sugeria downgrade incompatível do Next. O gate completo de build, Tailwind, unitários e E2E decide a promoção.

Depois da atualização, os findings altos restantes pertencem à cadeia de desenvolvimento do ESLint/minimatch. Eles são build/lint-only e a remediação automática proposta exige mudança incompatível; ficam registrados, sem fingir que o audit inteiro está verde.

## Regra

Dependências novas ou atualizadas não podem aumentar dívida. Correção breaking exige tijolo focal, comparação e regressão completa; não autoriza salto destrutivo neste trabalho.
