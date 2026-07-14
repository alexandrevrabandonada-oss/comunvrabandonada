# Estado COMUN Sprint 7

Data: 2026-05-27

## Objetivo do tijolo

Criar a primeira estrutura publica de mini-dossies do COMUN, com lista e pagina interna compartilhavel, usando apenas conteudo sanitizado e sem abrir edicao publica.

## Rotas cobertas

- `/comun/dossies`
- `/comun/dossies/[slug]`

## O que mudou

### 1. Lista publica de dossies

Arquivo alterado:

- [app/comun/dossies/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/page.tsx>)

A lista agora traz:

- titulo `Dossies do COMUN`
- explicacao editorial sobre memoria coletiva
- cards de mini-dossies
- badge de status
- indicadores simples de padroes, fontes e encaminhamentos
- estado vazio honesto, se nao houver dossies publicados

### 2. Pagina publica de mini-dossie

Arquivo alterado:

- [app/comun/dossies/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/[slug]/page.tsx>)

A pagina agora inclui:

- titulo
- resumo executivo
- comunidade relacionada
- pauta relacionada
- status
- resumo executivo e contexto
- linha do tempo
- padroes identificados
- relatos sanitizados associados
- fontes e materiais uteis
- encaminhamentos
- perguntas em aberto
- CTA `Enviar relato relacionado`

### 3. Seed publico enriquecido

Arquivos alterados:

- [lib/seed-data.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/seed-data.ts>)
- [lib/types.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/types.ts>)
- [lib/comun-data.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/comun-data.ts>)

O mini-dossie `burnout-e-pressao-no-trabalho` foi enriquecido com:

- linha do tempo
- padroes
- relatos sanitizados associados
- fontes
- encaminhamentos
- perguntas em aberto
- status `published`

## Decisao tecnica importante

Para o publico, a estrutura de mini-dossie ficou apoiada no seed local publicado.

Motivo:

- havia inconsistencias entre o estado do banco e o que este tijolo precisava expor publicamente
- o criterio de pronto aceitava dossie seedado
- a solucao seedada permitiu fechar o uso compartilhavel sem abrir edicao publica ou depender de ajustes extras no admin

Isso significa:

- a pagina publica do mini-dossie e estavel
- a equipe ja consegue compartilhar o primeiro dossie
- a evolucao para dossies vindos integralmente do banco pode ficar para um tijolo posterior, sem contaminar este ciclo

## Regras de seguranca mantidas

- nenhum relato bruto e exibido
- nenhum contato privado e exibido
- os relatos associados no mini-dossie sao apenas sanitizados
- nao foi criada wiki publica nem edicao aberta

## Backups criados

- [backups/2026-05-27-sprint-7/app-comun-dossies-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-7/app-comun-dossies-page.tsx.bak>)
- [backups/2026-05-27-sprint-7/app-comun-dossies-slug-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-7/app-comun-dossies-slug-page.tsx.bak>)
- [backups/2026-05-27-sprint-7/lib-seed-data.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-7/lib-seed-data.ts.bak>)
- [backups/2026-05-27-sprint-7/lib-types.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-7/lib-types.ts.bak>)
- [backups/2026-05-27-sprint-7/lib-comun-data.ts.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-7/lib-comun-data.ts.bak>)

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

### Teste das rotas publicas

Validado em servidor local de producao:

- `/comun/dossies`: `200`
- `/comun/dossies/burnout-e-pressao-no-trabalho`: `200`

Checks confirmados:

- conteudo principal presente nas duas rotas
- mini-dossie compartilhavel e legivel
- nenhum vazamento de `raw_text`
- nenhum vazamento de `private_contact`

## Critério de pronto

Status:

- existe ao menos um mini-dossie seedado: sim
- pagina e util para compartilhar no Instagram/WhatsApp: sim
- `build/verify` passa: sim
- relatorio gerado: sim

## Riscos

1. O primeiro mini-dossie publico ainda e seedado, nao derivado integralmente do banco.
2. A administracao de dossies por curadoria ainda nao existe como fluxo proprio.
3. Pode ter sobrado um arquivo temporario de log local do teste (`.tmp-sprint7-start.log`) se o Windows manteve lock do processo; isso nao faz parte do codigo do modulo e pode ser apagado depois.

## Proximos passos recomendados

1. Criar fluxo admin para montar e publicar dossies a partir de pautas e relatos sanitizados.
2. Mover o mini-dossie atual do seed para persistencia editavel server-side.
3. Ligar dossies a auditoria de operacao editorial.
