# Compatibilidade de protocolos

| Entrada | Origem interna | Interface | Conversão |
|---|---|---|---|
| `COMUN-YYYYMMDD-######` | legado / legacy-v1 | Protocolo COMUN | nenhuma |
| `COMUN-RELATA-<16 hex>` | Relata / relata-v1 | Protocolo COMUN | nenhuma |
| aliases de fixture allowlisted | legacy ou futuro | Protocolo COMUN | somente resolução explícita |
| protocolo oficial, malformed ou vazio | não resolvido | estado seguro | rejeitado sem revelar existência |

Nenhum protocolo histórico muda de significado. O recibo novo nasce imediatamente em `captured_private`; acompanhamento legado continua no domínio legado até uma ponte futura comprovada.

