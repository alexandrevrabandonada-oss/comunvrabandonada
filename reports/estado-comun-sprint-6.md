# Estado COMUN Sprint 6

Data: 2026-05-27

## Objetivo do tijolo

Preparar a campanha-piloto `Trabalho e Burnout em Volta Redonda` como primeiro ciclo real de uso do COMUN, com link compartilhavel, CTA direto, formulario preselecionado, explicacao de anonimato, categorias de entrada, filtro facil no admin e texto interno de lancamento.

## O que mudou

### 1. Pauta publica da campanha fortalecida

Arquivo alterado:

- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)

Para a pauta `trabalho-burnout-volta-redonda`, entraram:

- destaque editorial com o texto principal:
  - `O problema que voce vive no trabalho pode nao ser so seu. Relate com seguranca no COMUN VR ABANDONADA.`
- bloco de cuidado sobre anonimato e remocao de dados pessoais
- aviso de enquadramento:
  - memoria coletiva e acompanhamento publico
  - nao e denuncia juridica formal
  - nao promete solucao individual
- CTA direto:
  - `Relatar situacao de trabalho`
- grade de categorias clicaveis:
  - pressao psicologica
  - assedio moral
  - burnout
  - atraso salarial
  - FGTS atrasado
  - terceirizacao
  - jornada abusiva
  - ferias impostas
  - risco de acidente
  - insalubridade/periculosidade
  - medo de denunciar
  - retaliacao

### 2. Formulario com pre-selecao de campanha

Arquivos alterados/criados:

- [app/comun/relatar/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/page.tsx>)
- [app/comun/relatar/report-form.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/report-form.tsx>)
- [app/actions.ts](</C:/Projetos/COMUM VR ABANDONADA/app/actions.ts>)

Mudancas:

- a rota server-side agora recebe `searchParams`
- o formulario client-side recebe valores iniciais por props
- quando a pessoa vem da campanha, o formulario abre com:
  - tema `trabalho`
  - pauta `trabalho-burnout-volta-redonda`
  - categoria da campanha, se enviada por query string
- existe bloco explicito de campanha dentro do formulario
- a categoria da campanha entra no envio como `campaign_category`

### 3. Persistencia sem quebrar o modelo atual

Decisao tecnica:

- nao foi criada coluna nova no banco neste ciclo
- a categoria da campanha e preservada de forma editorial no campo `title`, com prefixo padronizado quando a categoria e escolhida

Exemplos:

- `[Burnout]`
- `[Assedio moral] Jornada e metas no setor X`

Motivo:

- mantivemos compatibilidade com o schema atual
- evitamos introduzir dependencia de migration nao aplicada
- seguimos o padrao existente sem abrir arquitetura paralela

### 4. Admin com filtro facil para campanha

Arquivo alterado:

- [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)

Melhorias:

- card de filtro rapido para `Trabalho e Burnout`
- link direto para a pauta publica piloto
- filtro por `pauta`
- filtro por `categoria da campanha`
- leitura da categoria derivada do prefixo do titulo nos cards da inbox

## Textos internos de lancamento

Arquivo criado:

- [docs/campanha-trabalho-burnout-lancamento.md](</C:/Projetos/COMUM VR ABANDONADA/docs/campanha-trabalho-burnout-lancamento.md>)

Conteudo:

- link principal da campanha
- texto principal
- texto de cuidado
- enquadramento editorial
- categorias de entrada
- legenda curta
- chamada curta para story
- CTA

## Backups criados

- [backups/2026-05-27-sprint-6/app-comun-relatar-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/app-comun-relatar-page.tsx.bak>)
- [backups/2026-05-27-sprint-6/app-comun-pautas-slug-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/app-comun-pautas-slug-page.tsx.bak>)
- [backups/2026-05-27-sprint-6/app-comun-admin-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/app-comun-admin-page.tsx.bak>)
- [backups/2026-05-27-sprint-6/app-actions.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/app-actions.ts.bak>)
- [backups/2026-05-27-sprint-6/lib-types.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/lib-types.ts.bak>)
- [backups/2026-05-27-sprint-6/lib-seed-data.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-6/lib-seed-data.ts.bak>)

## Verificacao

### Build e verificacao

Comando:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

### Teste do link compartilhavel da campanha

Validado por HTTP local em artefato de producao:

- `/comun/pautas/trabalho-burnout-volta-redonda`

Checks:

- texto principal presente
- texto de cuidado presente
- CTA `Relatar situacao de trabalho` presente
- categorias de entrada presentes

### Teste do formulario preselecionado

Validado por HTTP local:

- `/comun/relatar?comunidade=trabalho&pauta=trabalho-burnout-volta-redonda&categoria=burnout`

Checks:

- bloco `Campanha-piloto: Trabalho e Burnout em Volta Redonda` presente
- seletor `Categoria principal da campanha` presente
- categoria `Burnout` presente
- pauta relacionada presente no fluxo

## Tentativa de migration

Houve uma tentativa inicial de criar uma coluna propria para categoria da campanha, mas a aplicacao remota da migration falhou por permissao do role usado pelo CLI e por dependencia de `SUPABASE_DB_PASSWORD`.

Decisao final deste tijolo:

- remover a dependencia dessa migration no runtime
- manter a classificacao da campanha dentro do modelo atual, usando prefixo editorial no `title`

## Riscos

1. A categoria da campanha ainda nao tem coluna propria no banco; ela esta representada editorialmente no `title`.
2. O filtro por categoria no admin depende desse prefixo padronizado.
3. Se a equipe quiser analytics finos por categoria no futuro, sera melhor criar coluna dedicada em um tijolo proprio.

## Criterio de pronto

Status:

- campanha tem link compartilhavel: sim
- formulario classifica corretamente relatos da campanha: sim, por tema+pauta preselecionados e categoria de campanha persistida editorialmente
- admin consegue filtrar: sim
- equipe consegue lancar no Instagram com seguranca: sim, com apoio do arquivo interno e textos de cuidado

## Proximos passos recomendados

1. Se a campanha ganhar volume, criar coluna dedicada para categoria da campanha com migration aplicada corretamente.
2. Adicionar busca no admin por prefixo/categoria e por protocolo.
3. Produzir um post/arte estatico derivado do arquivo interno de lancamento.
