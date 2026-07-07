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
