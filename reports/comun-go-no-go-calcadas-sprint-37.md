# GO/NO-GO — Mapa Real das Calçadas, Sprint 37

**Data:** 20/07/2026

| Dimensão | Decisão | Evidência / bloqueio |
| --- | --- | --- |
| Técnica local | NO-GO integral | Núcleo, resets, RLS, build, E2E público e jornada autenticada do participante passaram; falta continuar a mesma fixture pela operação até memória e executar regressões completas. |
| Experiência | NO_GO_HUMAN_EXPERIENCE | Gate humano permanece 0/3. |
| Operação | NO_GO_OPERATIONAL_READINESS | Fila e prioridade existem, mas a equipe ainda não executou a cadeia completa e o protocolo fixture pela interface. |
| Cartografia | NO_GO_REAL_BASEMAP_REVIEW | Somente fixture local sintética; provider real e licença não foram escolhidos nem auditados. |
| Remoto | NO_GO_REMOTE_REVIEW | Ambiente remoto não foi acessado nem revisado. |

`COMUN_SIDEWALK_REAL_MAP_LOCAL_OK` não emitido.

## Declarações

- Piloto público: NÃO ABERTO
- Integração principal: NÃO EXECUTADA
- Push: NÃO EXECUTADO
- Deploy: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Tiles remotos: NÃO UTILIZADOS NOS TESTES
- Dados reais: NÃO UTILIZADOS
- Custo externo: R$ 0

## Decisão superveniente da Sprint 37.2 — 20/07/2026

| Gate | Decisão atual |
| --- | --- |
| Técnica local | `TECHNICAL_LOCAL_READY` |
| Experiência | `NO_GO_HUMAN_EXPERIENCE` — 0/3 |
| Operação | `NO_GO_OPERATIONAL_READINESS` |
| Cartografia | `NO_GO_REAL_BASEMAP_REVIEW` |
| Remoto | `NO_GO_REMOTE_REVIEW` |

`COMUN_SIDEWALK_REAL_MAP_LOCAL_OK` foi comprovado em production-like local. Esta atualização não abre piloto público nem autoriza operação remota.
