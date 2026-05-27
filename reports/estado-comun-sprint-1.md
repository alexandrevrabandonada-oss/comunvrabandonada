# Estado COMUN Sprint 1

Data: 2026-05-27

## Objetivo do tijolo

Criar a primeira home publica navegavel em `/comun`, com proposta clara, visual forte e fluxo obvio para envio de relato.

## O que mudou

A home publica em [app/comun/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/page.tsx>) foi ajustada para deixar o COMUN mais explicito como ferramenta comunitaria de relatos, debates e memoria coletiva, sem cara de rede social generica.

Entraram ou foram reforcados os seguintes blocos:

- nome explicito `COMUN VR ABANDONADA`
- subtitulo `Relatos, debates e memoria coletiva da cidade.`
- hero com a frase `O problema que parece isolado pode ser coletivo.`
- texto de apoio sobre relato seguro e memoria popular
- CTA primario `Enviar relato agora` para `/comun/relatar`
- microtexto de confianca sobre anonimato e remocao de dados sensiveis
- comunidades iniciais
- pautas em acompanhamento
- bloco `Como funciona`
- bloco explicito de seguranca com link para `/comun/seguranca`
- assinatura final `Escutar. Cuidar. Organizar.`

## Estrategia tecnica

- mantido o fluxo sem login para a area publica
- mantidos dados de comunidades e pautas a partir da estrutura ja existente
- nenhuma feature social nova foi introduzida
- nenhum banco, migration ou autenticacao nova foi criada neste tijolo
- mantida a pagina como server component dinamico, seguindo o padrao atual do modulo

## Arquivos alterados ou criados

Alterado:

- [app/comun/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/page.tsx>)

Criado:

- [reports/estado-comun-sprint-1.md](</C:/Projetos/COMUM VR ABANDONADA/reports/estado-comun-sprint-1.md>)

## Observacoes de contexto

- havia alteracoes locais preexistentes no working tree fora do escopo deste tijolo
- essas alteracoes nao foram revertidas nem alteradas por este trabalho

## Alinhamento com o criterio de pronto

- `/comun` funciona no desktop e mobile pelo build atual
- o CTA de relato esta visivel no hero e repetido no bloco de fluxo
- a pagina nao parece vazia
- o visual permanece alinhado ao tema VR Abandonada: preto, amarelo, off-white e linguagem industrial
- a home continua sem exigir login e sem introduzir feed, likes ou comentarios

## Resultado da verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

## Riscos

- a validacao aqui foi por build/verificacao; nao houve rodada visual em navegador neste tijolo
- a home depende da consistencia dos dados retornados por `listCommunities()` e `listIssues()`
- o working tree ja continha mudancas abertas fora deste escopo, o que exige cuidado antes de commit futuro

## Proximos tijolos recomendados

1. Fazer uma passada visual em navegador local e mobile para ajustar densidade, espacamento e ergonomia do CTA.
2. Refinar a pagina `/comun/relatar` como formulario publico principal do produto.
3. Consolidar a linguagem de seguranca e curadoria entre home, relatar e pagina `/comun/seguranca`.
4. Criar teste visual ou smoke HTTP focado na presenca dos blocos criticos da home.
