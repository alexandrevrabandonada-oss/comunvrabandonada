# Contrato de verificação operacional de canais

Estados permitidos: `source_verified`, `public_entry_reachable`, `authentication_boundary_observed`, `service_category_observed`, `form_fields_observed`, `review_boundary_observed`, `submission_boundary_observed`, `protocol_behavior_unconfirmed`, `operationally_observed_no_submission`, `degraded`, `unavailable`.

O registro local contém somente canal, adapter, versão da fonte, tipo de observação, estado, data, ambiente, requisitos sanitizados, comportamento de anexos, fronteira de revisão/submissão, acessibilidade, notas móveis, resultado, hash de evidência e vencimento da revisão. RLS é forçada; acesso é `service_role` server-side; API e flags são cloaked quando desligadas.

Não são permitidos credenciais em CI, CAPTCHA, cadastro automatizado, submissão, protocolo inferido, contato exposto, URL dinâmica, open redirect ou acesso a sessão Fiscaliza.
