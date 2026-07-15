# Cleanup do Storage de arte

`cleanupArtworkStorageScope()` aceita apenas prefixos locais conhecidos, é idempotente e retorna fingerprints em vez de chaves integrais.

`npm run prune:art-storage -- --dry-run` é o padrão seguro. A remoção exige `ART_STORAGE_PRUNE_CONFIRM=true`. O script recusa host remoto por `assertLocalEnvironment()`.
