# Pautas sociais

## O que e

Uma pauta social e um espaco publico organizado em torno de um problema real. Ela reune relatos sanitizados, protocolos oficiais, contribuicoes moderadas, sintese publica e tarefas coletivas.

Ela nao e feed global, chat, ranking, like ou rede social generica.

## Diferencas

- Relato: registro enviado por uma pessoa. Pode ter texto bruto privado e versao publica sanitizada.
- Pauta: espaco coletivo para discutir e organizar um problema recorrente.
- Protocolo: acompanhamento de demanda enviada a canal oficial.
- Tarefa: acao concreta aberta para organizacao comunitaria.
- Dossie: sintese editorial futura, revisada e publicavel.

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

## Caminho para dossie

Uma pauta pode virar dossie quando houver volume, evidencias, protocolos, respostas oficiais e sintese madura. O dossie continua exigindo revisao humana antes de publicacao.

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
6. So depois criar dossie.
