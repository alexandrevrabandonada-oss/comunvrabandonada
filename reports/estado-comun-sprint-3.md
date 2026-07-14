# Estado COMUN Sprint 3

Data: 2026-05-27

## Objetivo do tijolo

Consolidar a persistencia minima de relatos, ligar o formulario publico a essa persistencia, garantir protocolo unico, manter a caixa de entrada administrativa funcional e completar os filtros basicos pedidos.

## Diagnostico

A maior parte da base pedida ja existia antes deste ciclo:

- tabela `comun_reports` ja criada em [supabase/migrations/202605070001_initial_comun.sql](</C:/Projetos/COMUM VR ABANDONADA/supabase/migrations/202605070001_initial_comun.sql>)
- protocolo unico ja gerado em [lib/protocol.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/protocol.ts>)
- formulario `/comun/relatar` ja integrado a persistencia pela action `submitReport` em [app/actions.ts](</C:/Projetos/COMUM VR ABANDONADA/app/actions.ts>)
- admin inbox ja existente em [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)
- separacao entre `raw_text`, `public_text` e `private_contact` ja aplicada no modelo e nas regras de leitura publica

Neste tijolo, o trabalho necessario foi completar e endurecer a caixa de entrada administrativa sem abrir arquitetura paralela.

## Modelo conceitual ja coberto

O modelo minimo pedido ja esta representado hoje em `comun_reports`:

- `id`
- `protocol`
- `community_slug`
- `title`
- `raw_text`
- `public_text`
- `period_text`
- `approximate_location`
- `involved_entity`
- `is_anonymous`
- `can_publish_sanitized`
- `accepts_contact`
- `private_contact`
- `status`
- `risk_level`
- `internal_notes`
- `created_at`
- `updated_at`

Regras observadas:

- `private_contact` nao entra em tela publica
- `raw_text` nao entra em publicacao automatica
- `public_text` so aparece publicamente quando publicado e sanitizado
- `status` inicial do envio continua `received`

## O que mudou neste sprint

### 1. Caixa de entrada admin completada

Arquivo alterado:

- [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)

Melhorias aplicadas:

- filtro por `status`
- filtro por `tema`
- filtro por autorizacao de publicacao com `sim` e `nao`
- filtro por aceita contato com `sim` e `nao`
- filtro por faixa de data (`data_de` e `data_ate`)
- exibicao mais clara de autorizacao, contato e data de criacao na lista

### 2. Backup local antes da alteracao

Backup criado conforme solicitado:

- [backups/2026-05-27-sprint-3/app-comun-admin-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-3/app-comun-admin-page.tsx.bak>)

## Persistencia e integracao do formulario

Status:

- o formulario `/comun/relatar` continua gravando em `comun_reports`
- o protocolo continua sendo gerado no servidor
- o relato entra como `received`
- `private_contact` continua separado do texto principal
- `public_text` continua vazio ate revisao/publicacao sanitizada

## Verificacao executada

### Verify

Comando:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

### Smoke do modulo

Comando:

```bash
npm run smoke:comun
```

Resultado:

- insercao de relato via chave publica: ok
- persistencia interna em `comun_reports`: ok
- view publica sem campos privados: ok

### Teste direto de persistencia e inbox

Teste manual automatizado neste ciclo:

- inserido relato de teste por cliente publico
- localizado na tabela interna por service role
- confirmado `status = received`
- confirmado `private_contact` armazenado internamente
- confirmado que o protocolo nao apareceu em `comun_public_reports`
- cleanup do relato de teste executado ao final

## Critério de pronto

Status:

- relato enviado aparece na caixa de entrada: sim
- dados sensiveis estao separados: sim
- projeto verifica e builda: sim
- relatorio documenta proximos passos: sim

## Arquivos alterados ou criados

Alterado:

- [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)

Criado:

- [reports/estado-comun-sprint-3.md](</C:/Projetos/COMUM VR ABANDONADA/reports/estado-comun-sprint-3.md>)
- [backups/2026-05-27-sprint-3/app-comun-admin-page.tsx.bak](</C:/Projetos/COMUM VR ABANDONADA/backups/2026-05-27-sprint-3/app-comun-admin-page.tsx.bak>)

## Riscos e limitacoes

1. O filtro de data hoje acontece no servidor da pagina depois do carregamento da lista dos ultimos 100 relatos, nao por query paginada no banco.
2. A caixa de entrada ainda nao tem paginacao.
3. `Outro tema` no formulario ainda depende de classificacao posterior da curadoria, nao de modelagem propria.
4. Acompanhamento por protocolo ainda nao virou tela dedicada para a pessoa que enviou.

## Proximos passos recomendados

1. Mover filtros da inbox para consulta server-side parametrizada no banco, com paginacao.
2. Criar busca por protocolo no admin.
3. Implementar trilha de acompanhamento por protocolo sem expor dados privados.
4. Criar modelagem explicita para `Outro tema`, sem enquadramento provisoria.
