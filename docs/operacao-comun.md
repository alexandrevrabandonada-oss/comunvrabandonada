# Operacao COMUN

## Rotina de curadoria

1. Entrar em `/comun/admin`.
2. Abrir relatos novos.
3. Ler relato bruto apenas internamente.
4. Remover nomes, CPF, telefone, endereco completo e dados de terceiros.
5. Escrever `public_text` como versao publica sanitizada.
6. Associar comunidade e pauta.
7. Definir risco.
8. Publicar apenas se houver autorizacao e texto sanitizado.
9. Arquivar relatos duplicados, inseguros ou fora de escopo.

## Cuidados

- Nunca publicar contato privado.
- Nunca copiar relato bruto para pagina publica.
- Nunca publicar foto recebida no relato rapido sem curadoria explicita.
- Nunca publicar latitude/longitude precisa. Use bairro/local aproximado ou texto sanitizado.
- Publicacao nao significa confirmacao automatica de todos os fatos.
- Casos de risco imediato devem ser orientados para canais formais adequados.
- Protocolo Popular nao substitui Ouvidoria oficial e nao envia demanda automaticamente.

## Relato rapido

O modo rapido serve para problemas vistos na rua: buraco, calcada, lixo, entulho, fumaca, iluminacao, transporte e situacoes parecidas.

Na curadoria:

1. verificar se a categoria rapida foi classificada corretamente;
2. conferir a foto por signed URL temporaria no admin;
3. tratar foto como privada ate decisao explicita;
4. usar localizacao precisa apenas como apoio interno;
5. publicar somente texto sanitizado e local aproximado quando fizer sentido.

## Curadoria de anexos

Fila operacional:

1. abrir `/comun/admin/anexos`;
2. revisar pendentes primeiro;
3. marcar blur/redacao quando houver rosto, placa, documento, uniforme, cracha, endereco, tela de celular ou crianca;
4. reprovar quando imagem for inutil, sensivel demais ou fora de escopo;
5. subir versao publica segura somente depois de edicao externa;
6. nunca publicar original.

Para cada foto recebida:

1. ver a miniatura/link temporario do original apenas internamente;
2. conferir protocolo, comunidade, pauta e data de envio;
3. escolher uma decisao: aprovado apenas interno, precisa blur/redacao, reprovado ou versao publica segura;
4. quando precisar publicar imagem, editar fora do sistema e subir a versao ja redigida/blurada;
5. confirmar que `public_approved` ficou verdadeiro somente com a versao segura.

O arquivo original permanece no bucket privado `comun-report-attachments`. A versao segura vai para `comun-public-safe-attachments`, que tambem e privado.

### Rotina diaria de anexos

1. Abrir `/comun/admin/anexos`.
2. Filtrar pendentes.
3. Priorizar pendentes ha mais de 72h.
4. Marcar blur/redacao quando houver rosto, placa, documento, crianca, cracha, endereco ou dado identificavel.
5. Reprovar foto inutil ou arriscada.
6. Subir versao segura apenas apos edicao externa.
7. Verificar auditoria.

### Rotina semanal de anexos

1. Revisar anexos `needs_redaction`.
2. Conferir se ha pendencias acumuladas.
3. Revisar reprovados antigos somente quando houver politica futura de limpeza.
4. Confirmar que signed URLs e originais nao foram compartilhados fora do admin.

## Protocolo Popular / Ouvidoria assistida

Rotina publica:

1. A pessoa abre `/comun/acompanhar/[protocolo]/ouvidoria`.
2. O COMUN gera texto com dados seguros do relato.
3. A pessoa copia o texto e abre o canal oficial.
4. A pessoa registra a demanda no canal oficial.
5. A pessoa informa no COMUN o numero oficial recebido.
6. A pessoa pode registrar resposta recebida, sabendo que a resposta completa nao aparece publicamente por padrao.

Rotina admin:

1. Abrir o relato no admin.
2. Revisar a secao `Protocolo oficial`.
3. Conferir canal, numero oficial, status e datas.
4. Se houver resposta, manter `response_text` privado.
5. Escrever `public_summary` apenas com resumo seguro.
6. Marcar resolvido/nao resolvido quando houver criterio.
7. Usar as metricas agregadas para identificar acumulados por pauta, comunidade e canal.

Limites:

- COMUN nao e Prefeitura nem Ouvidoria oficial.
- COMUN nao promete prazo ou resposta oficial.
- Texto gerado e assistente de redacao, nao protocolo oficial.
- Dados privados do relato nunca devem entrar no texto gerado.

### Rotina semanal de protocolos oficiais

1. Abrir `/comun/admin/protocolos-oficiais`.
2. Filtrar vencidos.
3. Olhar pautas recorrentes em `Inteligencia operacional`.
4. Revisar respostas sem resumo publico.
5. Cobrar retorno quando necessario, fora do COMUN e pelo canal oficial adequado.
6. Registrar resposta recebida sem publicar `response_text` completo.
7. Escrever `public_summary` apenas quando houver resumo seguro.
8. Marcar resolvido ou nao resolvido.
9. Selecionar pautas candidatas a dossie.

### Leitura para futuros dossies

O painel mostra possiveis dossies quando encontra:

- pauta com 3 ou mais protocolos;
- pauta com 2 ou mais vencidos;
- comunidade com 3 ou mais protocolos na mesma pauta;
- resposta oficial insatisfatoria;
- nao resolvidos acumulados.

Essa leitura e interna. Antes de qualquer publicacao, a equipe ainda precisa revisar evidencias, anonimizar trechos e decidir o recorte editorial.
