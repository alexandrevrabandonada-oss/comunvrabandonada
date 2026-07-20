# Backup e restore operacional local

O procedimento exige `COMUN_LOCAL_ONLY=1`, produz inventário, contagem e SHA-256, e rejeita restore se formato, contagem ou checksum divergirem. O gate 33.1 usa `pg_dump` no Postgres local, cria um banco descartável isolado, restaura o dump, confirma a fixture e os grants fechados, destrói o banco e remove dump, inventário e fixture. Não restaura sobre o banco principal e não acessa rede remota.
