# Miniaplicativos de pauta

Cada pauta pode ativar módulos de um catálogo fechado, validado por Zod. O compositor administrativo cria módulos privados em rascunho; só módulos ativos e públicos são renderizados. Pautas sem módulos permanecem na página legada.

Os modelos são idempotentes: uma nova confirmação não duplica tipos já existentes. Configurações são JSON estrito, sem HTML ou código executável.
