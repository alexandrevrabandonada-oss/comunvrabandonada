# COMUN — 48.1A · diagnóstico de piloto allowlisted

Status: planejamento bloqueado até preflight remoto read-only e checkpoint.

Branch: `codex/tijolo-48-1a-owner-allowlisted-pilot`
Base: `dcc0baa414c114f2ced7e8d57aae1f32af1af233`
Correção focal adicional: cloak 404 para todos os métodos do endpoint Relata.

## Escopo seguro

Piloto fechado, explicitamente allowlisted, para o responsável pelo produto.
Não é amostra humana, não é lançamento público e não habilita encaminhamento
automático. O piloto deve usar somente os domínios já implementados (Relata,
Carteira, onboarding territorial e superfícies dormentes), sem ativar Google
real sem configuração verificada.

## Dependências

1. merge técnico do 48.0M e Production no SHA exato;
2. preflight remoto read-only sanitizado (SHA, deployment, ledger, schema,
   RLS, grants, buckets, flags e fingerprints);
3. comparação dos checksums das migrations locais-only;
4. backup/checkpoint e rollback comprovados;
5. confirmação de zero P0/P1 e zero envio externo;
6. allowlist por ID opaco, sem e-mail ou PII.

Nenhuma escrita remota foi executada por este diagnóstico. A conexão Supabase
disponível não autorizou o projeto COMUN; a listagem acessível continha apenas
projetos não relacionados. Portanto schema, ledger, RLS, grants, buckets,
fingerprints e allowlist permanecem não observados.
