# Estado COMUN Sprint 8 - UX e responsividade publica

Data: 2026-05-27 14:11:15 -03:00

## Objetivo do tijolo

Fazer uma passada visual e responsiva nas telas publicas principais do COMUN, sem abrir novas features e sem tocar no schema do banco, auth ou fluxo sensivel.

## Rotas revisadas

- `/comun`
- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`
- `/comun/dossies`
- `/comun/dossies/[slug]`
- `/comun/relatar`
- `/comun/seguranca`

## Diagnostico visual

Os problemas principais estavam em tres grupos:

1. Header publico comprimido em mobile:
   - marca longa demais no topo;
   - CTA de relato concorrendo com navegacao em largura curta.

2. Hierarquia e acoes publicas ainda fracas:
   - home boa visualmente, mas ainda mais "vitrine" do que "porta de entrada";
   - paginas de comunidade, pauta e dossie com CTA existente, mas sem um bloco mais claro de proximo passo.

3. Pontos classicos de responsividade:
   - cards e titulos longos precisando de quebra mais segura;
   - formulario publico com navegacao por etapas muito apertada no mobile;
   - ausencia de um smoke dedicado para textos/CTAs publicos.

## Problemas corrigidos

### 1. Shell publico e CTA de relato

Arquivo alterado:

- [components/comun-shell.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/comun-shell.tsx>)

Mudancas:

- header com quebra mais segura;
- marca com largura controlada em mobile;
- navegacao secundaria mobile separada do CTA;
- CTA desktop mantido no header;
- CTA mobile fixo no rodape (`Enviar relato`) para manter acao sempre visivel;
- `overflow-x-hidden` no shell publico.

Resultado:

- o botao `Relatar` deixou de competir com o titulo no header;
- o CTA publico ficou visivel em desktop e mobile.

### 2. Home mais orientada a acao

Arquivo alterado:

- [app/comun/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/page.tsx>)

Mudancas:

- hero mantido, mas com titulo ajustado para mobile;
- reforco do CTA principal `Enviar relato agora`;
- faixa nova `Relate um problema em poucos passos`;
- atalhos rapidos para temas recorrentes:
  - Buraco ou calcada
  - Lixo ou entulho
  - Poluicao ou po preto
  - Escola
  - Saude
  - Trabalho
- cards de comunidades com CTA editorial mais claro.

Resultado:

- a home ficou mais acionavel e menos contemplativa;
- a entrada para `/comun/relatar` ficou obvia ja no primeiro viewport.

### 3. Comunidades, pautas e dossies

Arquivos alterados:

- [app/comun/comunidades/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/comunidades/page.tsx>)
- [app/comun/c/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/c/[slug]/page.tsx>)
- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)
- [app/comun/dossies/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/page.tsx>)
- [app/comun/dossies/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/[slug]/page.tsx>)
- [app/comun/seguranca/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/seguranca/page.tsx>)

Mudancas:

- titulos longos reduzidos no mobile;
- textos com quebra segura (`overflow-wrap`);
- cards com altura e fluxo mais previsiveis;
- comunidade ganhou bloco `Nesta comunidade voce pode`;
- pauta ganhou bloco `O que acontece depois?`;
- dossies ganharam explicacao editorial e CTA `Ver dossie`;
- pagina interna de dossie ganhou contexto mais compartilhavel;
- pagina de seguranca ganhou CTA direto para relato.

Resultado:

- paginas internas ficaram mais legiveis em mobile;
- CTA principal permaneceu claro em cada contexto:
  - home: `Enviar relato agora`
  - comunidade: `Enviar relato nesta comunidade`
  - pauta: `Enviar relato parecido` / `Relatar situacao de trabalho`
  - dossie: `Enviar relato relacionado`

### 4. Formulario publico

Arquivo alterado:

- [app/comun/relatar/report-form.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/report-form.tsx>)

Mudancas:

- `overflow-x-hidden` no fluxo;
- botoes das etapas com empilhamento seguro no mobile;
- botoes de navegacao inferior com grid seguro no mobile;
- campos com largura total garantida;
- textos longos em cards de resumo com quebra segura.

Resultado:

- o formulario ficou mais confortavel para toque;
- a etapa atual continua clara sem pressionar a largura da tela.

### 5. CSS global

Arquivo alterado:

- [app/globals.css](</C:/Projetos/COMUM VR ABANDONADA/app/globals.css>)

Mudancas:

- `overflow-x: clip` no `body`;
- max-width padrao para midia;
- classe `.comun-prose` para quebra segura;
- manutencao do foco visivel.

## Status do overflow horizontal

Verificacao real feita com Edge headless via DevTools Protocol nas larguras:

- 360px
- 390px
- 768px
- 1024px
- 1366px

Rotas medidas:

- `/comun`
- `/comun/comunidades`
- `/comun/pautas/trabalho-burnout-volta-redonda`
- `/comun/dossies/burnout-e-pressao-no-trabalho`
- `/comun/relatar`

Resultado:

- em 360px: `scrollWidth == clientWidth`
- em 390px: `scrollWidth == clientWidth`
- sem overflow horizontal nas rotas publicas testadas

Observacao:

- os screenshots headless iniciais pareciam sugerir corte visual em textos grandes;
- a medicao via CDP confirmou que o layout nao ultrapassava a viewport;
- os ajustes finais de titulo e containers reduziram a pressao visual mesmo sem overflow estrutural.

## Status dos CTAs

- header desktop: CTA `Relatar` visivel
- mobile: CTA fixo `Enviar relato` visivel
- home: CTA `Enviar relato agora` visivel
- comunidades: CTA de entrada claro
- pauta: CTA forte de relato parecido
- seguranca: CTA direto para relato

## Nao vazamento publico

Mantido.

Os checks publicos continuaram sem expor:

- `raw_text`
- `private_contact`
- `internal_notes`

## Arquivos alterados

- [app/comun/admin/auditoria/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/auditoria/page.tsx>)
- [app/comun/c/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/c/[slug]/page.tsx>)
- [app/comun/comunidades/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/comunidades/page.tsx>)
- [app/comun/dossies/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/[slug]/page.tsx>)
- [app/comun/dossies/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/page.tsx>)
- [app/comun/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/page.tsx>)
- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)
- [app/comun/relatar/report-form.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/report-form.tsx>)
- [app/comun/seguranca/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/seguranca/page.tsx>)
- [app/globals.css](</C:/Projetos/COMUM VR ABANDONADA/app/globals.css>)
- [components/comun-shell.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/comun-shell.tsx>)
- [package.json](</C:/Projetos/COMUM VR ABANDONADA/package.json>)
- [scripts/smoke-comun-no-leak-http.mjs](</C:/Projetos/COMUM VR ABANDONADA/scripts/smoke-comun-no-leak-http.mjs>)
- [scripts/smoke-comun-public-ui.mjs](</C:/Projetos/COMUM VR ABANDONADA/scripts/smoke-comun-public-ui.mjs>)

## Ajuste fora do escopo visual, mas necessario

Arquivo alterado:

- [app/comun/admin/auditoria/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/auditoria/page.tsx>)

Motivo:

- o `build` falhou durante a coleta de dados desta rota;
- adicionei `export const dynamic = "force-dynamic"` para manter o comportamento consistente com a area admin protegida.

## Resultado dos smokes e verify

Ambiente usado para HTTP/UI:

- `http://localhost:4020` com `next build` + `next start`

Comandos:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run smoke:comun`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:admin-auth`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:no-leak-http`
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:public-ui`

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou
- `verify`: passou
- `smoke:comun`: passou
- `smoke:admin-auth`: passou
- `smoke:no-leak-http`: passou
- `smoke:public-ui`: passou

## Riscos restantes

1. Os screenshots headless do Edge ainda nao sao tao confiaveis quanto uma passada manual em navegador interativo para avaliar percepcao de densidade visual.
2. O CTA mobile fixo melhora acao, mas ainda vale testar em celular real para ver se ele nao compete demais com a navegacao do aparelho.
3. Dossies ainda dependem mais de texto do que de sinais visuais de distribuicao/encaminhamento; isso e editorial, nao tecnico.

## Proximos passos recomendados

1. Fazer uma passada manual em celular real e navegador comum ja com esse ajuste visual.
2. Criar smoke visual mais profundo por screenshot diff ou CDP com comparacao de layout.
3. Refinar feedback visual da pagina `/comun/relatar/confirmacao` para acompanhamento e proximo passo.
