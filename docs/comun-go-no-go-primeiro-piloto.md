# Go/no-go do primeiro piloto

Cada linha deve receber PASS, FAIL ou NOT APPLICABLE, responsável funcional e evidência datada.

| Categoria | Gate | Estado local 33.1 | Responsável funcional | Evidência |
| --- | --- | --- | --- | --- |
| Técnico | build, E2E e cleanup verdes | em verificação | suporte | relatório 33.1 |
| Segurança | RLS e nenhum host remoto | PASS | suporte | `RLS_MATRIX_OK` |
| Privacidade | original privado e plantão | PASS local | privacidade | matriz e plantão |
| Direitos | gate impede publicação pendente | PASS local | direitos | teste de incidente |
| Operação/equipe | titulares e substitutos reais confirmados | FAIL | coordenação | nomes não definidos localmente |
| Conteúdo inicial | pacote sintético revisado | PASS local | edição | rehearsal |
| Suporte/monitoramento | cobertura real confirmada | FAIL | coordenação | canal externo não configurado |
| Backup | restore descartável comprovado | PASS | suporte | `COMUN_LOCAL_RESTORE_OK` |
| Reversão | plano multicamada disponível | PASS | coordenação | plano de reversão |
| Comunicação | mensagens reais aprovadas | FAIL | coordenação | fora do escopo local |

NO-GO automático: papel crítico sem responsável; backup sem restore; retirada sem plantão; RLS falhando; dado real em fixture; Storage privado exposto; direito pendente publicado; E2E vermelho; Axe sério/crítico; cleanup falhando; ambiente remoto não revisado; ou reversão ausente. Decisão atual: **NO-GO para abertura pública**, apesar do pacote local poder ficar tecnicamente pronto.
