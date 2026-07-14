# Backup local do Acervo

O PC administrativo é uma cópia local, nunca o servidor do Acervo.

- Execute `npm run backup:archive-manifest` semanalmente.
- Mantenha cópia em HD externo e outra cópia independente.
- Sincronize periodicamente os dois buckets R2 com ferramenta S3 confiável.
- Preserve originais e versões públicas em diretórios/buckets separados também no backup.
- Valide checksums e restauração por amostragem.
- Nunca dependa de uma única cópia.

O manifest fica em `backups/acervo/manifest-AAAA-MM-DD.json`, inclui metadados, relações, direitos, status, checksums e object keys, mas não baixa os binários. `backups/` fica fora do Git.
