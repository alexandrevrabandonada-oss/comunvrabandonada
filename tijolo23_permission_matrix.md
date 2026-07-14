# Tijolo 23 - Matriz de permissoes

## Admin

- Gerencia equipe.
- Publica e despublica dossies quando gates passam.
- Revisa factual.
- Revisa editorial.
- Acessa auditoria e operacao completa.

## Editor

- Edita dossie.
- Prepara versao publica.
- Revisa factual/editorial pela regra atual.
- Nao gerencia equipe.
- Nao publica sem papel `publisher` ou `admin`.

## Factual reviewer

- Aprova, rejeita ou solicita ajuste factual.
- Nao aprova editorial.
- Nao publica.
- Nao gerencia equipe.

## Editorial reviewer

- Aprova, rejeita ou solicita ajuste editorial.
- Nao aprova factual.
- Nao publica.
- Nao gerencia equipe.

## Publisher

- Publica/despublica quando todos os gates passam.
- Nao revisa factual/editorial automaticamente.
- Nao gerencia equipe.

## Viewer

- Leitura admin limitada.
- Sem acoes criticas.
- Nao revisa.
- Nao publica.
- Nao gerencia equipe.

## Gates globais

- Acoes criticas exigem perfil ativo.
- Publicacao exige revisores reais distintos.
- Ultimo admin ativo e protegido contra auto-bloqueio operacional.
