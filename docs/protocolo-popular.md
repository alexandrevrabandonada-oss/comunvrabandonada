# Protocolo Popular / Ouvidoria assistida

## O que e

Protocolo Popular e o fluxo do COMUN que transforma um relato comunitario em texto pronto para registrar uma demanda em canal oficial.

Ele nao substitui a Ouvidoria oficial. Ele ajuda a escrever, organizar e acompanhar.

## Limites

- O COMUN nao envia automaticamente para Prefeitura ou qualquer orgao.
- O COMUN nao promete resposta oficial.
- O protocolo oficial so existe depois que a pessoa registra a demanda no canal oficial.
- O usuario decide se vai enviar o texto.
- O numero oficial deve ser informado pelo usuario depois do envio.

## Como gerar texto

1. Abrir `/comun/acompanhar/[protocolo]/ouvidoria`.
2. Conferir o texto gerado.
3. Copiar o texto.
4. Abrir o canal oficial.
5. Registrar a demanda no canal oficial.
6. Guardar o numero do protocolo oficial.
7. Voltar ao COMUN e informar o numero.

## Dados usados

O texto usa apenas superficie segura:

- protocolo COMUN;
- comunidade/categoria;
- bairro ou local aproximado;
- periodo informado;
- versao publica sanitizada quando existir;
- descricao minima baseada em campos seguros quando a versao publica ainda nao existir.

Nunca usar:

- `raw_text`;
- `private_contact`;
- `internal_notes`;
- latitude/longitude precisa;
- signed URL ou path de anexos.

## Resposta oficial

A resposta completa pode conter dados pessoais ou detalhes sensiveis. Por isso:

- `response_text` fica privado por padrao;
- pagina publica pode mostrar status de resposta recebida;
- resumo publico deve ser escrito em `public_summary` pelo admin, quando houver uma versao segura.

## Uso em pauta ou dossie

Quando houver protocolo oficial informado, a equipe pode usar isso como evidencia operacional na pauta ou no dossie. O uso publico deve sempre preferir:

- protocolo COMUN;
- numero oficial, se nao expuser dado pessoal;
- resumo publico sanitizado;
- status do encaminhamento.

## Painel admin de protocolos oficiais

A equipe acompanha a fila em `/comun/admin/protocolos-oficiais`.

Rotina semanal:

1. Abrir `/comun/admin/protocolos-oficiais`.
2. Filtrar vencidos.
3. Cobrar retorno quando necessario, sempre pelo canal oficial apropriado.
4. Registrar resposta recebida em campo privado.
5. Escrever resumo publico seguro quando a resposta puder ser compartilhada.
6. Marcar resolvido ou nao resolvido.
7. Olhar a secao `Inteligencia operacional`.
8. Revisar pautas/comunidades recorrentes e possiveis dossies.

Cuidados:

- nao publicar `response_text` completo;
- nao copiar dados pessoais da resposta para `public_summary`;
- nao prometer prazo ou resultado oficial;
- usar a fila como controle operacional, nao como envio automatico.

## Metricas e possiveis dossies

A secao `Inteligencia operacional` em `/comun/admin/protocolos-oficiais` calcula:

- tempo medio ate resposta;
- tempo medio ate resolucao;
- vencidos;
- aguardando resposta;
- respostas sem resumo publico;
- acumulados por pauta, comunidade e canal/agencia.

A secao `Possiveis dossies` e apenas um radar interno. Ela sinaliza pautas ou recortes locais com volume, vencimento, resposta insatisfatoria ou nao resolvidos acumulados. Ela nao cria dossie automaticamente e nao publica resposta completa.

Quando um sinal amadurece, o admin pode criar uma pauta social. A pauta organiza discussao, contribuicoes moderadas e tarefas publicas antes de qualquer dossie final.

## Vínculo com a esteira política

Um protocolo oficial continua sendo a fonte canônica da tramitação. A esteira
da pauta apenas guarda o vínculo depois que o protocolo foi revisado como
evidência da mesma pauta. O número e o resumo público podem aparecer no ciclo;
texto bruto, contatos e notas continuam privados.

Registrar uma resposta não resolve a pauta. A resposta precisa de resumo
público sanitizado; o resultado é avaliado separadamente e a memória só pode ser
publicada quando houver evidência verificada. O COMUN não envia automaticamente
uma demanda real a órgão externo.
