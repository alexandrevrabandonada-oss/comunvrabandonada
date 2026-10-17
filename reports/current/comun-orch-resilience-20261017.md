# ORCH-V2 — recuperação operacional — 17/10/2026

ENTREGUE: candidato de correção na própria #556, a partir do HEAD remoto confirmado976243dc; nenhuma PR/branch nova.

VERIFICADO: 113 testes locais pré-commit, sem falha/skip, incluindo Git/processos reais, CAS, crash, operação incerta, memória sem escrita de runtime e rollback descendente.

PENDENTE neste commit: testes no SHA commitado, ativação/readback real e revisão independente reativada por fonte externa real. Nenhum PASS de CI/Preview é inferido.

PRÓXIMO MOVIMENTO: publicar uma vez com intenção reconciliada, consolidar por CAS preservando V1/ledger, canário reversível e mesma automação40min. Registrar a aceitação final na ref canônica.

A fila completa e as fontes capazes de destravar WAIT_EXTERNAL estão no JSON adjacente. Escola/humano continuam protegidos. O cursor de backoff fica no bloco da memória obrigatória; evidência igual não grava ledger/ref.
