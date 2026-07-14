# Curadoria de anexos COMUN

## Regra principal

Nunca publicar o arquivo original enviado pela pessoa. O original fica privado em `comun-report-attachments`.

Imagem so pode ser considerada para uso publico quando houver uma versao separada, redigida/blurada manualmente, no bucket privado `comun-public-safe-attachments`.

## Status

- `pending`: aguardando revisao.
- `approved_private`: util apenas como evidencia interna.
- `needs_redaction`: precisa blur, corte ou redacao antes de qualquer uso publico.
- `public_ready`: existe versao publica segura e `public_approved=true`.
- `rejected`: nao usar.

## Quando marcar blur/redacao

Marque `needs_redaction` quando a imagem mostrar ou sugerir:

- rosto identificavel;
- placa de veiculo;
- documento, boleto, tela de celular ou computador;
- crianca ou adolescente;
- endereco completo, numero de casa, portao ou fachada identificavel;
- uniforme, cracha ou dado de local de trabalho;
- pessoa em situacao vulneravel;
- qualquer dado que possa identificar denunciante ou terceiro.

## Como gerar versao publica segura

1. Abra `/comun/admin/anexos`.
2. Revise a fila de pendentes ou filtre por status/comunidade/data.
3. Abra o original por signed URL temporaria no admin.
4. Marque blur/redacao quando houver rosto, placa, documento, uniforme, cracha, endereco, tela de celular ou crianca.
5. Reprove quando a imagem for inutil, sensivel demais ou fora de escopo.
6. Se a imagem puder ser usada publicamente, baixe e edite fora do sistema.
7. Aplique blur/redacao suficiente para remover identificacao.
8. Salve uma nova imagem.
9. Envie essa nova imagem pela acao `Enviar versao publica segura`.
10. Confirme que o status ficou `public_ready` e que `public_approved=true`.

Fluxo antigo pelo detalhe do relato continua disponivel:

1. Abra o original por signed URL temporaria no admin.
2. Baixe e edite fora do sistema.
3. Aplique blur/redacao suficiente para remover identificacao.
4. Salve uma nova imagem.
5. Envie essa nova imagem no bloco `Enviar imagem ja redigida/blurada`.
6. Confirme que o status ficou `public_ready` e que `public_approved=true`.

## Rotina diaria

1. Abrir `/comun/admin/anexos`.
2. Filtrar pendentes.
3. Priorizar pendentes ha mais de 72h.
4. Marcar blur/redacao quando houver rosto, placa, documento, crianca, cracha, endereco ou dado identificavel.
5. Reprovar foto inutil ou arriscada.
6. Subir versao segura apenas apos edicao externa.
7. Verificar auditoria.

## Rotina semanal

1. Revisar anexos `needs_redaction`.
2. Conferir se a fila de pendentes nao acumulou itens antigos.
3. Revisar reprovados antigos somente quando houver politica operacional definida.
4. Confirmar que nenhum original foi publicado ou compartilhado fora do admin.

## Observacoes

Use notas curtas e objetivas, sem copiar texto privado, contato, endereco completo ou nome de pessoa. Exemplo: `Borrar rosto no canto esquerdo e placa ao fundo`.

## Auditoria

As acoes administrativas registram eventos:

- `attachment_review_updated`
- `attachment_marked_needs_redaction`
- `attachment_rejected`
- `attachment_public_safe_uploaded`

A metadata nao deve conter signed URL, path completo sensivel, texto bruto ou contato privado.
