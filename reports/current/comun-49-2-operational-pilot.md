# COMUN 49.2 — piloto operacional de entidade coletiva

## Ponto de partida certificado

A vinculação segura de contas existentes foi integrada pelo PR #477 em
`560ad798e3c3cd1be8de704f840ceb872d775293`. Production ficou READY no deploy
`dpl_95YSjhDsKz8nRRFfKLQA1R9RbjMz`, com aliases canônicos e sem aliasError.
CI, Core Journeys, Quality, Experience e Civic Graph pós-merge passaram.
O primeiro Civic Graph teve queda SIGSEGV do Chromium; a segunda tentativa
passou no mesmo SHA, sem mudança de código.

R1–R5, cadastro de entidades, desk R4, desk R5 e vinculação de especialistas
estão disponíveis. Este próximo bloco prepara a primeira operação humana;
não concede perfil nem cria entidade, consentimento, candidato, revisão,
decisão ou projeção em Production.

## Checagem de prontidão

O workflow `COMUN 49.2 operational pilot read-only readiness` captura apenas
contagens agregadas em uma transação read-only. Ele deduplica os revisores por
identidade Auth, exige acesso administrativo ativo e calcula elegibilidade pelo
snapshot R4 já existente. Nenhum nome, e-mail, UUID, evidência, justificativa,
localização ou conteúdo de relato entra no artefato.

O resultado indica o próximo gate mecânico. Contagem global de perfis não
prova independência para uma entidade específica. `publicationAuthorized`
permanece falso em todos os estados; a decisão real pertence à desk R5.
A checagem não inspeciona nem altera flags de ambiente e não certifica o estado
atual do mapa: ela simplesmente não concede autoridade cartográfica.

## Sequência do piloto

| Etapa | Responsável | Superfície | Condição de avanço |
| --- | --- | --- | --- |
| Indicação do publisher | Administrador | `/comun/admin/equipe` | Identificar uma pessoa real e o e-mail exato de sua conta COMUN existente. Preservar pelo menos dois revisores operacionais. |
| Vinculação | Administrador autenticado | `/comun/admin/equipe` | Conferir a identidade e confirmar explicitamente o perfil `publisher`. Não criar conta ou enviar convite automático. |
| Declaração | Representante real | `/comun/entidades` | Nome público, tipo e representação devem corresponder à entidade real. |
| Consentimento | Representante real | `/comun/entidades` | Ler o aviso versionado e autorizar explicitamente somente a projeção sanitizada. |
| Candidato privado | Representante real | `/comun/entidades` | Preparar o candidato com ação própria; consentimento sozinho não o cria. |
| Existência da entidade | Revisor A | `/comun/admin/entidades/revisao` | Examinar evidência real e registrar decisão fundamentada; não presumir `supported`. |
| Legitimidade da representação | Revisor B | `/comun/admin/entidades/revisao` | Revisor distinto de A; sem autorevisão. Contestação ou lacuna exige retenção e esclarecimento. |
| Decisão R5 | Publisher independente | `/comun/admin/entidades` | Rechecagem ao vivo, justificativa privada e decisão explícita `hold`, `reject` ou `publish`; publicação requer confirmação adicional. |
| Verificação posterior | Operador | Checagem read-only + desk | Conferir histórico e projeção sanitizada sem expor conteúdo privado. |

Nenhuma decisão é inferida de uma contagem. O publisher não pode representar
a entidade candidata; ter perfil operacional não elimina esse impedimento.
`eligible_for_projection_review` continua sendo elegibilidade para revisão,
jamais aprovação de publicação.

## Evidência e contenção

- Registrar os SHAs, run IDs e hashes dos artefatos sanitizados; detalhes de
  identidade e evidência permanecem nos ambientes privados autorizados.
- Ensaios de idempotência, autorevisão, conflito, contestação, revogação,
  supressão e republicação já têm prova descartável R4/R5. Não provocar esses
  eventos em uma entidade real para fabricar um resultado de teste.
- Se legitimidade ou consentimento deixam de ser válidos, o R5 suprime a
  projeção sem apagar decisões. Restaurar elegibilidade não republica:
  exige nova decisão explícita do publisher.
- Esta checagem não chama RPCs de mutation, não aplica migrations, não repara
  histórico remoto e não exporta linhas privadas.

## Próximos gates do roadmap

1. Indicar e vincular o publisher real sem reduzir a capacidade R4.
2. Executar a cadeia humana acima com uma entidade real e autorização própria.
3. Certificar a primeira decisão e o DTO sanitizado, sem inferir consentimentos.
4. Projetar uma superfície pública somente em slice posterior e separado.
5. Manter mapa, coordenadas, relatos individuais e `future_map_eligibility`
   fora do piloto; qualquer abertura cartográfica exige seu próprio gate.

Estado deste slice: `COMUN_49_2_OPERATIONAL_PILOT_READINESS_PREPARED_MAP_CLOSED`.
A escolha do publisher ainda não foi fornecida por este documento.
