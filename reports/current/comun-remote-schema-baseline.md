# Baseline canônico do schema remoto

Estado: `CURRENT_CANONICAL`

- Captura: 23 de julho de 2026, exclusivamente read-only.
- Fingerprint: `1616eca2d978e17fb18c4568f12e4c4e43ae05dbe3b1e097b1c9b9c89b296574`
- Algoritmo: `sha256-json-canonical-order-v1`.
- Escopo: metadados de `public`, `auth`, `storage` e histórico de migrations.
- Relações: 207; colunas: 2.651; constraints: 1.114; índices: 532.
- Policies: 45; funções catalogadas: 30; grants: 2.814.
- Buckets: 4, sem nomes de objetos; migrations registradas: 41.

O artefato JSON contém somente catálogo sanitizado. Não contém linhas de
aplicação, usuários, e-mails, coordenadas, filenames, object keys ou segredos.

Verificação:

```bash
npm run db:baseline:verify
```

O comando consulta o mesmo catálogo em modo read-only, recalcula o fingerprint
e falha diante de drift. Ele nunca corrige o banco.

