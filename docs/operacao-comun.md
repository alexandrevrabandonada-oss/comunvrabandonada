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
