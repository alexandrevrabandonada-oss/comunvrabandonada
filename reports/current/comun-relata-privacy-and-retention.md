# COMUN Relata — privacidade e proposta de retenção do 48.0C

Atualizado em 3 de agosto de 2026. Esta é uma proposta técnica local, não uma
política definitiva de produção.

## Fronteira de dados

- original e respostas livres ficam no schema `private`;
- projeção operacional contém somente classificação, regra, estado, protocolo
  COMUN e eventos;
- o protocolo sozinho não autoriza leitura;
- segredo de recibo, idempotência e ator são persistidos somente como hashes;
- contato não é coletado; localização e até três fotografias são opcionais,
  pós-recibo e somente no laboratório local 48.0C;
- coordenada exata usa AES-256-GCM server-side e agrupamento recebe apenas
  chaves HMAC com chave separada;
- fotografias ficam em bucket privado, passam por validação real e geram
  derivada privada recodificada, sem se tornarem publicáveis;
- snapshot público existe apenas como contrato bloqueado e permanece vazio;
- nenhum órgão externo recebe conteúdo e nenhuma migration chega ao remoto.

## Acesso e logging

RLS é forçada em todas as tabelas. O navegador chama somente a API same-origin;
as três RPCs são executáveis apenas pela service role do runtime Node local e
exigem prova de posse. Ausência, protocolo desconhecido e segredo incorreto são
indistinguíveis para evitar enumeração. Eventos não podem ser atualizados ou
removidos.

São proibidos em logs: original, resposta livre, protocolo completo, segredo,
hash, endereço, coordenada, IP, telefone, e-mail, cookie, header e conteúdo de
fonte externa. Os testes negativos usam fixtures de PII e falham se qualquer
uma aparecer na saída sanitizada.

## Classes propostas

| Classe | Exemplo | Ação atual | Decisão pendente |
| --- | --- | --- | --- |
| `incomplete` | relato não concluído | revisão calculável, zero auto-delete | prazo e base legal |
| `withdrawn` | retirada confirmada | bloquear uso; preservar evento mínimo | prazo do original e auditoria |
| `submitted_future` | futuro envio externo | inalcançável no 48.0C | obrigação institucional |
| `private_location` | coordenada opcional | criptografar; retirar acesso sem apagar história | prazo e rotação de chave |
| `private_evidence` | foto selada ou retirada | bloquear publicação; incluir no cleanup dry-run | prazo dos bytes e revisão |
| `audit_event` | transição append-only | manter sanitizado | janela de auditoria |
| `collective_membership` | vínculo operacional | inativar na retirada; preservar evento | janela de auditoria |

Cada relato persiste `retention_policy_version`, classe e data calculável de
revisão. O script `relata:retention:dry-run` somente contabiliza candidatos,
não emite dados pessoais e nunca executa delete. Resultado observado:
`deletesExecuted=0`, `remote=not_contacted`.

O ensaio de recuperação inclui o schema `private` quando presente, além de
`public` e `supabase_migrations`. A restauração ocorre em PostgreSQL isolado e
compara separadamente as contagens privadas e públicas; o backup bruto nunca é
publicado como artefato.

O cleanup de evidências é idempotente e dry-run por padrão; qualquer mutação
exige loopback e confirmação literal, nunca destino remoto. Qualquer prazo
definitivo, eliminação real ou promoção remota exige decisão de produto,
privacidade e obrigação institucional em tijolo futuro.
