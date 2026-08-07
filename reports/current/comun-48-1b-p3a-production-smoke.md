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
fixture remota. O smoke P3A de ativação fica pendente até o preflight
server-side.
