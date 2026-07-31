# Backup e restore local

O procedimento legado de operação continua disponível com
`COMUN_LOCAL_ONLY=1`, checksum e banco descartável. Ele cobre somente as tabelas
da fila editorial e não deve ser citado como restore integral.

O Tijolo 47.8 acrescenta:

- `npm run security:rls:local`: catálogo completo de tabelas, views, funções,
  sequences, default privileges, buckets e policies;
- `npm run security:restore:database:local`: dump custom de `public` e
  `supabase_migrations`, restore num Postgres descartável, identidades-sombra
  sintéticas, comparação de contagens e integridade estrutural;
- `npm run security:restore:storage:local`: objetos sintéticos privados e
  públicos nos quatro buckets locais, perda, restore em namespace isolado e
  cleanup;
- `npm run security:migration-recovery`: falha transacional, compatibilidade,
  correção forward-only e restore isolado;
- `npm run security:incidents`: quinze cenários sanitizados com deduplicação e
  encerramento.

Nenhum comando restaura sobre o banco principal. O restore remoto usa dados
reais somente dentro do runner efêmero e publica apenas métricas agregadas.
Consulte `docs/comun-security-backup-recovery.md`.
