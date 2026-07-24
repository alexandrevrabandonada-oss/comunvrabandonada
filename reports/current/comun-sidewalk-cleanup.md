# Cleanup remoto das calçadas

Estado: execução mutável desabilitada.

O schema necessário existe no Supabase remoto e a produção está verde. O job
`sidewalk-cleanup-dry-run` do workflow `COMUN Nightly` observa somente tickets
expirados e registra contagens agregadas (`examined`, `eligible`, `removed`,
`missing` e `skippedRace`). Ele não recebe `--execute`; portanto `removed`
permanece zero e nenhum objeto ou registro é alterado.

O modo mutável não está autorizado no Tijolo 41. O estado esperado após uma
observação bem-sucedida é:

`COMUN_SIDEWALK_CLEANUP_REMOTE_DRY_RUN_OK`

## Observação de 23 de julho de 2026

Execução `30040532595`, job `89319115746`:

- examinados: 0;
- elegíveis: 0;
- removidos: 0;
- ausentes: 0;
- descartados por corrida: 0.

Resultado: `COMUN_SIDEWALK_CLEANUP_REMOTE_DRY_RUN_OK`.
