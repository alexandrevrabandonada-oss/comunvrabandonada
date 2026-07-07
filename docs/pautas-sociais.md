# Pautas sociais

## O que e

Uma pauta social e um espaco publico organizado em torno de um problema real. Ela reune relatos sanitizados, protocolos oficiais, contribuicoes moderadas, sintese publica e tarefas coletivas.

Ela nao e feed global, chat, ranking, like ou rede social generica.

## Diferencas

- Relato: registro enviado por uma pessoa. Pode ter texto bruto privado e versao publica sanitizada.
- Pauta: espaco coletivo para discutir e organizar um problema recorrente.
- Protocolo: acompanhamento de demanda enviada a canal oficial.
- Tarefa: acao concreta aberta para organizacao comunitaria.
- Dossie: rascunho editorial interno, revisado a partir de evidencias seguras, protocolos e tarefas.

## Criar pauta

1. Abrir `/comun/admin/pautas`.
2. Criar titulo, resumo, comunidade e categoria.
3. Definir status inicial, normalmente `observing` ou `organizing`.
4. Escrever sintese publica apenas com informacoes seguras.
5. Publicar quando houver recorte claro.

Tambem e possivel criar pauta social a partir de sinais em `/comun/admin/protocolos-oficiais`.

## Moderar contribuicoes

1. Abrir `/comun/admin/pautas/[id]`.
2. Revisar contribuicoes pendentes.
3. Aprovar somente texto seguro.
4. Rejeitar ou arquivar contribuicoes com dados pessoais, ataque, boato sem contexto ou exposicao de terceiros.
5. Usar nota de moderacao para explicar decisao internamente.

Contato privado nunca deve ser copiado para a area publica.

## Fila global de moderacao

A fila global fica em `/comun/admin/pautas/contribuicoes`.

Use a fila para:

- revisar pendentes de todas as pautas;
- priorizar `risk_level=high` e `moderation_priority=possible_abuse`;
- filtrar por pauta, tipo, status, risco e periodo;
- aprovar, rejeitar ou arquivar sem abrir cada pauta.

Os motivos de risco sao internos. Hashes, IP, user-agent e contato privado nao aparecem publicamente.

## Controle de envio excessivo

Contribuicoes publicas usam hash nao reversivel do IP quando disponivel. A regra inicial limita:

- 5 contribuicoes por hora;
- 20 contribuicoes por dia.

Quando o limite e excedido, a pessoa recebe uma mensagem educada para tentar novamente mais tarde. A leitura publica da pauta nao e bloqueada.

## Desafio leve e triagem

O formulario publico usa:

- honeypot invisivel;
- pergunta simples de atencao.

A triagem interna marca risco quando ha texto muito curto, repeticao recente, excesso de links, termos ofensivos simples, envios recentes demais, honeypot preenchido ou desafio errado. Nada disso publica a contribuicao automaticamente.

## Sintese publica

A sintese publica deve:

- resumir o que ja se sabe;
- separar fato observado de avaliacao;
- evitar nomes, contatos, enderecos completos e dados de terceiros;
- mencionar limites da apuracao;
- apontar proximo passo.

## Tarefas

Tarefas sao acoes simples:

- buscar informacao publica;
- organizar reuniao;
- revisar resposta oficial;
- escrever resumo seguro;
- preparar material para futuro dossie.

Nao usar tarefa para expor contato privado.

## Dossie por pauta

Uma pauta pode virar dossie quando houver volume, evidencias, protocolos, respostas oficiais e sintese madura. O primeiro passo e sempre interno:

1. Abrir `/comun/admin/pautas/[id]`.
2. Revisar checklist editorial.
3. Aprovar somente evidencias `approved + public_safe`.
4. Usar o bloco `Dossie da pauta` para criar ou regenerar rascunho.
5. Editar em `/comun/admin/dossies/[id]`.
6. Conferir o preview admin em `/comun/admin/dossies/[id]/preview`.
7. Preparar versao publica revisada nos campos `public_*`.
8. Enviar para revisao editorial, aprovar e publicar somente depois do checklist de seguranca.

O rascunho nao publica uma pagina final automaticamente. A pagina publica usa apenas `public_title`, `public_summary` e `public_body`.

## Qualidade editorial

Antes de uma pauta virar dossie, revisar no admin:

- checklist editorial;
- historico de versoes da sintese;
- evidencias aprovadas;
- sensibilidade de cada evidencia.

Evidencias so aparecem publicamente quando:

- `status='approved'`;
- `sensitivity='public_safe'`.

Nunca publicar:

- `internal_note`;
- evidencia `private_only`;
- evidencia `candidate`, `rejected` ou `archived`;
- resposta oficial completa sem resumo publico;
- acusacao sem evidencia revisada.

## Como transformar uma pauta em dossie

1. Moderar contribuicoes.
2. Aprovar evidencias seguras.
3. Revisar sintese publica.
4. Preencher checklist editorial.
5. Definir proximo passo.
6. Criar rascunho interno do dossie.
7. Remover evidencia duvidosa.
8. Escrever demandas e proximos passos.
9. Usar preview admin para revisar vazamento.
10. Publicar somente pelo workflow editorial do dossie.

O preview e interno. Nunca colocar nele:

- `raw_text`;
- `private_contact`;
- `response_text` completo;
- `internal_notes`;
- signed URL ou `storage_path`;
- evidencia `private_only`.

Depois de publicar, alteracoes no rascunho interno nao alteram a pagina publica automaticamente. Edite a versao publica revisada e publique novamente quando necessario.
