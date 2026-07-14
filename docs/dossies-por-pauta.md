# Dossies por pauta

## Conceito

O dossie por pauta e uma sintese editorial de uma pauta social. Ele nasce como rascunho interno e so vira pagina publica quando passa por revisao e publicacao controlada.

## Separacao obrigatoria

Campos internos:

- `public_version`;
- `internal_notes`;
- sintese executiva operacional;
- problema, evidencias, demandas e proximos passos em edicao.

Campos publicos revisados:

- `public_title`;
- `public_summary`;
- `public_body`;
- `public_slug`.

A rota publica usa snapshots publicados em `comun_pauta_dossier_publication_snapshots`. Alterar o rascunho interno ou os campos publicos revisados depois da publicacao nao altera automaticamente a pagina publica.

Smokes de publicacao devem criar snapshot ativo para validar rota publica. Apenas mudar `review_status` do rascunho para `published` nao publica pagina publica.

## Publicacao assistida e snapshots

Ao publicar, o admin cria uma copia imutavel dos campos publicos revisados:

- `public_title`;
- `public_summary`;
- `public_body`;
- `public_slug`.

O snapshot registra quem publicou, quando publicou e o status da versao. Uma nova publicacao supersede o snapshot ativo anterior e cria outro snapshot. A pagina publica sempre prefere o snapshot ativo `published` ou `rollback`.

O checklist final de publicacao precisa confirmar:

- titulo, resumo, corpo e slug revisados;
- ausencia de `raw_text`, `private_contact`, `response_text` completo, `internal_notes`, signed URL e `storage_path`;
- evidencias `approved + public_safe`;
- revisores reais distintos vinculados a perfis administrativos;
- confirmacao do publisher/admin.

## Workflow editorial

Status:

- `draft`;
- `editorial_review`;
- `changes_requested`;
- `approved`;
- `published`;
- `unpublished`;
- `archived`.

## Dupla revisao

Antes de publicar, o dossie precisa ter duas revisoes aprovadas:

- revisao factual;
- revisao editorial.

As revisoes precisam ser feitas por revisores reais distintos vinculados a perfis administrativos. A mesma pessoa/perfil nao pode aprovar as duas etapas.

## Fila de revisoes

A fila administrativa fica em:

- `/comun/admin/dossies/revisoes`

Ela mostra:

- pendentes de revisao factual;
- pendentes de revisao editorial;
- factual aprovado, faltando editorial;
- editorial aprovado, faltando factual;
- bloqueados por mesmo revisor;
- ajustes solicitados;
- rejeitados;
- prontos para publicar.

Use a fila no inicio da rotina editorial para decidir qual dossie precisa de acao antes da publicacao.

### Revisao factual

Confere:

- evidencias publicas revisadas;
- ausencia de dado pessoal;
- ausencia de contato privado;
- ausencia de resposta oficial completa;
- ausencia de acusacao sem base;
- distincao entre fato, relato e demanda;
- links e nomes publicos conferidos, quando houver.

### Revisao editorial

Confere:

- texto claro;
- linguagem objetiva;
- titulo adequado;
- resumo fiel;
- demandas compreensiveis;
- proximo passo claro;
- ausencia de exposicao desnecessaria.

Fluxo:

1. Criar rascunho a partir da pauta.
2. Preparar versao publica a partir do rascunho.
3. Revisar e editar `public_title`, `public_summary`, `public_body` e `public_slug`.
4. Enviar para revisao editorial.
5. Marcar checklist de seguranca.
6. Registrar revisao factual.
7. Registrar revisao editorial com outro revisor.
8. Aprovar para publicacao.
9. Preencher checklist final de publicacao.
10. Publicar criando snapshot.
11. Despublicar se houver erro, risco ou pedido de revisao.
12. Fazer rollback para snapshot anterior quando uma versao anterior segura precisar voltar ao ar.

## Criterios para publicar

Antes de aprovar:

- conferir que nao ha `raw_text`;
- conferir que nao ha `private_contact`;
- conferir que nao ha `response_text` completo;
- conferir que nao ha `internal_notes`;
- usar apenas evidencias `approved + public_safe`;
- protocolos oficiais aparecem apenas por resumo publico.

Antes de publicar:

- precisa haver uma aprovacao factual;
- precisa haver uma aprovacao editorial;
- os revisores reais precisam ser distintos e vinculados a perfis administrativos;
- o checklist final precisa estar completo.

## Como despublicar

1. Abrir `/comun/admin/dossies/[id]`.
2. Preencher motivo de despublicacao.
3. Usar acao `Despublicar`.
4. Confirmar que `/comun/dossies/[slug]` nao mostra mais a pagina.
5. Registrar ajuste no editor antes de publicar novamente.

## Como fazer rollback

1. Abrir `/comun/admin/dossies/[id]`.
2. Ir em `Historico de publicacao`.
3. Comparar o rascunho atual com o snapshot ativo quando necessario.
4. Escolher um snapshot anterior seguro.
5. Usar `Rollback para este`.
6. Confirmar que a rota publica voltou a usar a versao selecionada.

## Nunca publicar

- texto bruto de relato;
- contato privado;
- nota interna;
- resposta oficial completa sem resumo publico;
- signed URL;
- `storage_path`;
- evidencia `private_only`;
- evidencia `candidate`, `rejected` ou `archived`;
- acusacao sem evidencia revisada.
