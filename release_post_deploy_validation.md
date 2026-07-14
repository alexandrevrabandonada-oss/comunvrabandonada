# Validacao publica pos-release

Este plano depende de deploy autorizado e nao deve ser executado neste tijolo.

## Publico

1. Abrir `/comun`.
2. Abrir `/comun/dossies`.
3. Abrir um dossie publicado.
4. Abrir pauta publica relacionada.
5. Abrir comunidade relacionada.
6. Testar acompanhar protocolo.
7. Testar relato rapido.

## Seguranca

1. Rodar smoke HTTP de nao vazamento autorizado.
2. Confirmar ausencia de `raw_text`.
3. Confirmar ausencia de `private_contact`.
4. Confirmar ausencia de `internal_notes`.
5. Confirmar ausencia de `review_notes_internal`.
6. Confirmar ausencia de `storage_path`.
7. Confirmar ausencia de signed URL.
8. Confirmar que anexos seguem privados.
9. Confirmar que dossie publico usa snapshot ativo.

## Admin

1. Confirmar rota admin bloqueada sem sessao.
2. Login com admin real.
3. Confirmar filas de revisao.
4. Confirmar notificacoes internas.
5. Confirmar protocolos oficiais.
6. Confirmar auditoria.
