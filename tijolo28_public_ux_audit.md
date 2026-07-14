# Tijolo 28 - Auditoria de UX publica

Data: 2026-07-08
Ambiente: local

## UX implementada

- `/comun/dossies` agora organiza a descoberta por destaques, recentes, atualizados, pauta, comunidade e categoria.
- `/comun` ganhou bloco de destaque com acesso para todos os dossies.
- Paginas publicas de pauta exibem destaques da propria pauta somente quando ha destaque ativo.
- Estados vazios continuam genericos e nao revelam dossies internos ou despublicados.
- Recomendacoes nao criam feed, comentarios, likes ou superficie social.

## Linguagem publica

Os blocos usam apenas rotulo publico, nota publica, titulo, resumo, datas e metadados de snapshot.

## Status

UX implementada no codigo e validada por build/typecheck. Validacao end-to-end do destaque manual depende da migration aplicada no banco local/autorizado.
