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

A rota publica usa somente os campos publicos revisados. Alterar o rascunho interno depois da publicacao nao altera automaticamente a pagina publica.

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

As revisoes precisam ser feitas por revisores com nomes diferentes. A mesma pessoa nao pode aprovar as duas etapas.

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
9. Publicar.
10. Despublicar se houver erro, risco ou pedido de revisao.

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
- os nomes dos revisores precisam ser diferentes.

## Como despublicar

1. Abrir `/comun/admin/dossies/[id]`.
2. Usar acao `Despublicar`.
3. Confirmar que `/comun/dossies/[slug]` nao mostra mais a pagina.
4. Registrar ajuste no editor antes de publicar novamente.

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
