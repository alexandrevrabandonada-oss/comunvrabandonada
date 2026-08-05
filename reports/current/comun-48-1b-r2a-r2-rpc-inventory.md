# R2A-R2 runtime/RPC inventory

The production candidate is scoped to private Relata evidence and account/wallet continuity. Each required runtime operation is mapped to a server-only RPC and its owning table set. Collective grouping is intentionally deferred and guarded by `COMUN_RELATA_COLLECTIVE_ENABLED`; the disabled path returns before creating a database client or invoking a collective RPC.

| Surface | Runtime | RPC/table proof | Wave 1 |
| --- | --- | --- | --- |
| Location | add, withdraw, safe state | `comun_relata_add_location`, `comun_relata_withdraw_location`, `comun_relata_get_evidence_state` → private location/evidence consent tables | required |
| Photos | begin, validate, finalize, read, withdraw, reject | six RPCs → private attachments and private Storage bucket | required |
| Grouping | associate | no production RPC; fail-closed feature gate | deferred |
| Wallet/account | attach, account link, list | wallet RPCs → private wallet/items/events | required |

The exact candidate checksum is recorded in the adjacent JSON artifact. This inventory does not claim remote application; it is a local migration/runtime contract.
