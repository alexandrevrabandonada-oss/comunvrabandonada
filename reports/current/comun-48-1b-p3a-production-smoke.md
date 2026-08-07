# COMUN 48.1B-P3A — smoke de Production

Houve uma tentativa acidental de `vercel deploy --prod` a partir do worktree da
PR P3A (`2ab4055`), porque o `main` estava vinculado a outro worktree e o
`git switch main` não ocorreu. O alias foi revertido imediatamente, sem uso de
fixtures, migrations ou flags, para o deployment P2 estável
`dpl_542s3DLmDyTDur11Z4v3cxNBBt6k`.

Smoke read-only pós-rollback em `https://comunsocial.online`:

- `/comun=200`;
- `/comun/relatar=200`;
- `/comun/calcadas=200`;
- `/comun/relata/mapa=404`;
- APIs de evidência (`attachments`, `location`)=404;
- Carteira anônima=200.

Production permanece no estado P2:

- Conta ON;
- Carteira ON;
- Relata textual ON;
- fotos OFF;
- localização OFF;
- território, Google, Ônibus, forwarding e coletivos OFF;
- `launch_publicly=false`.

Não houve request de upload, signed URL, leitura de Storage, migration ou
fixture remota. O smoke P3A de ativação permanece pendente até o merge e a
ativação explícita da flag de anexos.

Atualização do preflight staged (2026-08-07): o deployment Production staged
`dpl_J8Ksnhye8ztj6xnqmBrbRtY4KUHt` respondeu `COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_GREEN`
por `vercel curl`, sem receber o alias `comunsocial.online`. O bucket foi
confirmado privado, 6/6 RPCs foram observadas e a leitura privada por anon foi
bloqueada. O endpoint diagnóstico retornou 404 no domínio canônico e foi
removido antes do merge. Nenhuma capacidade P3A foi ativada em Production.

Atualização pós-merge: PR #183 foi mesclada em
`6571c75acc49a234a1258ac8a588ee52ba76600d`. O deployment flags-off foi
`https://comunvrabandonada-2xvm0l8e5-alexandrevrabandonada-oss-projects.vercel.app`;
depois, `COMUN_RELATA_ATTACHMENTS_ENABLED` foi ativada isoladamente no
deployment `https://comunvrabandonada-ffzy079n8-alexandrevrabandonada-oss-projects.vercel.app`.

Smoke P3A ativo: `/comun/relatar=200` com botão de foto; localização ausente;
`/api/comun/relata/evidence/location=404`; foto sintética percorreu signed upload,
finalização e leitura privada; recibo inválido recebeu 404. A fixture foi
retirada e seus objetos Storage foram removidos/verificados por deployment
staged temporário. Conta, Carteira e Relata textual permaneceram ativos; Google,
território, Ônibus, forwarding, coletivos e `launch_publicly` permaneceram off.
