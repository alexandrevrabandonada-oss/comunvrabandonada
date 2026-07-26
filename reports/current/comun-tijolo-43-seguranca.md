# Tijolo 43 — segurança e privacidade

Atualizado em 24 de julho de 2026.

- original permanece no bucket privado `archive-private-originals`;
- coordenada exata permanece privada;
- mapa público recebe somente localização aproximada e conteúdo aprovado;
- confirmação de upload usa reivindicação condicional idempotente, lock datado,
  retomada de lock vencido e estado explícito de falha final ou recuperável;
- consentimento de publicação sanitizada e conferência final são obrigatórios;
- publicação exata foi removida da fila administrativa;
- nenhum contato, nota interna, caminho de Storage, original, identidade de
  moderador ou `service_role` integra a projeção pública;
- sugestão de duplicidade não altera nem apaga evidência;
- acesso privilegiado continua server-side e protegido por RLS.

Há uma migration local forward-only pendente de promoção, com manifesto e RLS
sem grants a `anon` ou `authenticated`. Não houve mudança remota ou segredo
versionado neste tijolo.
