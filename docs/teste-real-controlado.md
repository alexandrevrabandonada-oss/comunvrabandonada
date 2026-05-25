# Teste Real Controlado

## Objetivo

Validar o comportamento real do deploy publico sem criar novos fluxos nem ampliar escopo funcional.

## Relato teste 1

- Tema: Trabalho e Burnout
- Conteudo bruto deve conter uma palavra sensivel ficticia
- Incluir contato ficticio
- Incluir uma informacao que NAO deve aparecer publicamente
- No admin, escrever uma versao sanitizada em `public_text`
- Publicar
- Conferir a pagina publica da pauta
- Conferir evento em `/comun/admin/auditoria`

## Relato teste 2

- Tema: Meio Ambiente
- Simular relato simples sem contato
- Publicar versao sanitizada
- Conferir a comunidade e a pauta correspondente

## Relato teste 3

- Tema: Escolas
- Nao autorizar publicacao
- Confirmar que o admin ve o relato bruto internamente
- Confirmar que a tela alerta/bloqueia publicacao sem autorizacao

## Criterios de aceite

- publico so ve a versao sanitizada
- admin ve o bruto internamente
- contato nunca aparece publicamente
- relato sem autorizacao nao vai para publico sem alerta forte

## Registro manual recomendado

Anote para cada teste:

- horario
- rota usada
- protocolo do relato
- status final no admin
- evento de auditoria observado
- resultado observado na pagina publica
- resultado observado no celular
