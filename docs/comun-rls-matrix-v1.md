# Matriz integral de acesso da V1

Esta é a especificação canônica da auditoria integral de RLS e privilégios do
COMUN. A matriz humana de tabelas continua em
[`docs/comun-rls-matrix.md`](./comun-rls-matrix.md); a matriz efetivamente
observada é gerada por `npm run security:rls` em
`.security-evidence/10-rls-complete.json`.

O arquivo de evidência é sanitizado. Ele registra nomes de recursos e tipos de
argumentos, mas não registra linhas, identidades, object keys, hosts, URLs ou
valores de configuração.

## Escopo integral

A leitura de catálogo cobre:

- tabelas particionadas e comuns do schema `public`;
- views e materialized views, incluindo `security_invoker`, grants e nomes de
  colunas potencialmente privadas;
- funções e RPCs, com modo invoker/definer, `search_path`, assinatura, tipo de
  retorno e grants de execução;
- sequences e seus grants de uso;
- policies de `public` e policies de `storage.objects`;
- buckets e sua classificação pública/privada;
- default privileges;
- a superfície de `auth` somente como limite de política, sem ler usuários,
  identidades, sessões, fatores ou credenciais.

## Personas e operações

Cada tabela gera uma linha para cada combinação abaixo:

| Persona                    | SELECT                    | INSERT                    | UPDATE                    | DELETE                    | Resultado esperado              |
| -------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------------- |
| anon                       | conforme grant + policy   | conforme grant + policy   | conforme grant + policy   | conforme grant + policy   | somente projeção pública        |
| autenticado sem vínculo    | policy scoped             | policy scoped             | policy scoped             | policy scoped             | nenhum vínculo inferido         |
| visitante                  | conforme policy pública   | conforme policy pública   | conforme policy pública   | conforme policy pública   | somente superfície pública      |
| seguidor                   | policy scoped             | policy scoped             | policy scoped             | policy scoped             | vínculo verificado no servidor  |
| membro                     | policy scoped             | policy scoped             | policy scoped             | policy scoped             | somente escopo próprio          |
| coordenador                | policy scoped             | policy scoped             | policy scoped             | policy scoped             | escopo concedido no servidor    |
| editor                     | policy scoped             | policy scoped             | policy scoped             | policy scoped             | escopo editorial concedido      |
| administrador              | policy scoped             | policy scoped             | policy scoped             | policy scoped             | rota administrativa server-side |
| papel temporário           | policy scoped             | policy scoped             | policy scoped             | policy scoped             | concessão vigente obrigatória   |
| papel revogado             | bloqueado                 | bloqueado                 | bloqueado                 | bloqueado                 | revogação imediata ensaiada     |
| membro de outra comunidade | bloqueado fora do vínculo | bloqueado fora do vínculo | bloqueado fora do vínculo | bloqueado fora do vínculo | isolamento entre comunidades    |
| service role               | conforme grant            | conforme grant            | conforme grant            | conforme grant            | somente servidor                |

O catálogo mostra se o PostgreSQL concede a operação; a decisão fina de
seguidor, membro, coordenador, editor, administrador e comunidade é exercitada
pelos smokes de RLS e pelo ensaio de revogação. Um grant não transforma um
resultado `policy_scoped` em permissão irrestrita.

## Condições de promoção

`COMUN_RLS_COMPLETE_GREEN` exige simultaneamente:

- nenhuma tabela do schema exposto sem RLS;
- nenhum grant de tabela, sequence ou default privilege perigoso;
- nenhuma policy que use metadata JWT controlável pelo cliente como fonte de
  autorização;
- nenhuma view legível publicamente sem `security_invoker`, nem materialized
  view exposta;
- nenhuma coluna privada em view legível por `anon` ou `authenticated`;
- toda função `security definer` com `search_path` fixo;
- nenhuma função privilegiada executável por `anon` ou `authenticated`;
- nenhum bucket de original/privado marcado como público;
- nenhuma policy ampla de alteração ou exclusão em `storage.objects`;
- ensaio de revogação concluído.

Qualquer item não observado ou inconclusivo bloqueia a promoção; ausência de
achado em análise estática isolada não basta.
