# COMUN Relata — proposta de schema (somente desenho)

Status: proposta documental do Tijolo 48.0A. **Não é migration executável** e não foi aplicada a nenhum banco ou Storage.

## Princípios

- O preview 48.0A não persiste submissões e não chama canais externos.
- `Report` é a descrição recebida; `Case` é o processo de triagem; `Submission` é a futura entrega, sempre separada de `Protocol`.
- Todo original, localização exata, contato e anexo nasce privado/restrito. A projeção pública é uma derivada sanitizada, nunca o original.
- `Protocol.kind = comun` não é protocolo oficial. `official` só poderá existir após canal verificado e consentimento explícito.
- Decisões de roteamento são puras, versionadas e reproduzíveis; nenhum LLM decide urgência ou agência.

## Entidades e campos conceituais

| Entidade | Campos mínimos | Proteção |
| --- | --- | --- |
| `Report` | `id`, `summary_private`, `category`, `privacy_class`, `created_at` | texto bruto restrito; sem log de conteúdo |
| `Case` | `id`, `report_id`, `status`, `urgency`, `rule_version` | acesso por papel |
| `Agency` | `id`, `kind`, `display_name`, `verified` | catálogo allowlisted |
| `Channel` | `id`, `agency_id`, `source_status`, `verified`, `capabilities` | endpoint ausente até verificação |
| `RoutingRule` | `id`, `version`, `category`, `agency_kind`, `urgency` | imutável por versão |
| `RoutingDecision` | `category`, `agency_kind`, `urgency`, `missing_information`, `explanation` | sem chamada externa |
| `Submission` | `id`, `report_id`, `protocol_id`, `consent_id`, `status` | idempotência futura |
| `Protocol` | `value`, `kind`, `is_official`, `official_protocol` | COMUN/local separado de oficial |
| `StatusEvent` | `id`, `case_id`, `status`, `actor`, `occurred_at` | append-only |
| `Consent` | `version`, `accepted`, `allows_public_projection`, `allows_official_forwarding` | negação segura |
| `Attachment` | `id`, `mime_type`, `original_private`, `derivative_id`, `review_status` | original nunca público |
| `PrivateLocation` | `precision`, `encrypted_value`, `privacy_class` | nunca em resposta pública |
| `PublicLocation` | `precision`, `label`, `geometry_sanitized` | somente derivada revisada |
| `PublicSnapshot` | `summary`, `public_location`, `sanitized`, `reviewed` | publicação manual |
| `EscalationRule` | `from`, `to`, `trigger`, `requires_human_review` | sem escalada automática externa |

## Estados e filas futuras

Estados de caso: `draft`, `triage`, `awaiting_person`, `routed`, `human_review`, `resolved`, `withdrawn`. Filas futuras devem reutilizar `triage`, `safety`, `rights`, `publication`, `corrections` e `withdrawals`; não criar uma fila paralela só para apresentação.

## Idempotência futura

Uma futura submissão poderá aceitar `idempotency_key` opaca, limitada por usuário/sessão e janela de retenção. A chave deve ser armazenada com hash, vinculada a `report_id` e `rule_version`, e retornar o mesmo `Submission` sem repetir envio. O preview 48.0A não cria essa tabela nem executa mutation.

## Privacidade, retenção e auditoria

- `public_safe` pode ser mostrado com revisão mínima; `public_after_sanitization` exige derivada; `restricted`, `sensitive` e `high_risk` exigem revisão humana.
- Logs guardam somente IDs opacos, categoria, estado, versão de regra e códigos sanitizados; nunca texto, PII, coordenadas, anexos, signed URLs ou tokens.
- Retenção, criptografia, RLS, Storage privado e remoção devem ser definidos no tijolo 48.0B/segurança, antes de persistência.

## Canais

Fixtures 48.0A são explicitamente `unverified_fixture`, sem URL, telefone ou e-mail. Um canal só pode mudar para `verified` mediante evidência externa e revisão; ainda assim nenhum envio será habilitado neste tijolo.
