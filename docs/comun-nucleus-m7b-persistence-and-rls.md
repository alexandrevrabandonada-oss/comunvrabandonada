# SOC-D10.M7.B — Persistência privada de núcleos: proposta para revisão

**Estado:** arquitetura candidata, não autorizada para migração, sem tabelas
criadas, sem mudança de RLS ou Production. PR #572 permanece draft.
**Base:** SOC-D10.M7.A e modelo real de comunidades em
`supabase/migrations/20260719202300_comun_persistent_communities.sql`.

## Distinções de produto e finalidade

Acompanhamento, ingresso em comunidade, colaboração pontual, presença em
atividade, papel de facilitador, grupo de trabalho, formação e núcleo
permanente são vínculos distintos. Nenhuma evidência de uma dessas
categorias concede as demais. Não deduzir identidade política de
comportamento na plataforma. A adesão específica a núcleo é
voluntária e não precisa ser pública. A finalidade e o acesso aos
registros sensíveis exigem revisão humana e jurídico-privacidade.

**Produto proposto:** no fluxo voluntário de organização, apresentar
finalidade, regras, quem terá acesso, prazo e saída *antes* da caixa de
aceite. Solicitação nunca aprova automaticamente. A Mesa continua privada
e só poderá ser ampliada depois do portão de Auth/RLS do M7.

## Esquema conceitual mínimo — sem DDL executável

Propor schema isolado `comun_org_private`, fora dos schemas expostos
pela API pública, com RLS ativada em todas as tabelas como defesa
adicional. Nenhum `GRANT` a `anon` ou `authenticated` para leitura
genérica; escritas apenas por rotas server-side explicitamente revisadas.

| Entidade privada proposta | Chaves, estado mínimo e invariantes |
| --- | --- |
| `nuclei` | `id`, `community_id`, finalidade, versão das regras, `state`; nunca cria automaticamente vínculo |
| `nucleus_consents` | `id`, `nucleus_id`, `community_id`, `user_id`, versão/digest do aviso, `affirmed_at`, `withdrawn_at`; imutabilidade da evidência afirmativa, revogação explícita |
| `nucleus_requests` | `id`, `consent_id`, identidade/escopo, `state`, `requested_at`; pedido não confere leitura organizativa |
| `nucleus_reviews` | `id`, `request_id`, `reviewer_id`, decisão, horário, eventual revogação; revisor diferente do solicitante e com autoridade revisável comprovada |
| `nucleus_enrollments` | `id`, `request_id`, identidade/escopo, `state`, ativação, pausa/saída; um único vínculo ativo por pessoa/núcleo |
| `nucleus_mandates` | `id`, `nucleus_id`, titular, papel, oferta, aceite pelo próprio titular, vigência, revogação; não herda papel de comunidade |
| `nucleus_succession_offers` | `id`, mandato de origem, candidata, proponente, oferta/aceite/expiração; aceite só gera revisão, nunca troca titular |
| `nucleus_audit_events` | `id`, identidade técnica pseudonimizada quando cabível, evento, horário, escopo e causa; append-only, sem comentários livres ou filiação pública |

Usar FKs e verificações compostas de `community_id`/`nucleus_id`/
`user_id` para impedir desvio entre comunidades. Os registros de
consentimento e decisões preservam recibos mínimos sem conservar
conteúdo pessoal arbitrário. Desligamento revoga acesso prospectivo,
não exclui sem critério o histórico necessário a prestação de contas.
Reingresso requer novo pedido, nova revisão e novo vínculo; não
reativar uma linha `left`/ `revoked` silenciosamente.

## Matriz de leitura que deverá orientar RLS e serviço

| Recurso | Próprio titular autenticado | Revisor ativo com mandato explícito | Outros / público |
| --- | --- | --- | --- |
| Recibo do próprio consentimento/saída | Sim, escopo próprio mesmo após saída | Não por padrão | Nunca |
| Estado do próprio pedido/matrícula | Sim, escopo próprio | Somente resumo mínimo de solicitação sob revisão | Nunca |
| Mandatos e ofertas próprias | Sim, escopo próprio | Apenas quando revisão individual for autorizada | Nunca |
| Resumo de pedido alheio | Não | Somente núcleo/comunidade exatos, sem autoaprovação | Nunca |
| Lista geral de participantes | Não por padrão | Não por padrão | Nunca |
| Memória privada e deliberação | Contrato futuro separado | Contrato futuro separado | Nunca |
| Filiação em perfis, feed, busca e notificações públicas | Nunca por padrão | Nunca | Nunca |

O contrato executável **somente de design**
`lib/community-nucleus-read-boundary.ts` e seus testes codificam
a negativa pública, isolamento pessoal, revogação de evidência de revisor
e necessidade de escopo exato; **não** autorizam banco, rotas ou RLS.
Um `service_role` Supabase pode contornar RLS; qualquer leitura de
servidor requer `getUser`/identidade recente, propósito e escopo
verificados. Nenhuma relação de núcleo deve aparecer em payloads
públicos, cache offline, logs, telemetria, busca ou metadados HTML.

## Provas obrigatórias antes de qualquer migration

1. Revisão humana de finalidade/base legal, minimização, consentimento,
   legitimidade de revisores, retenção, exclusão e tratamento de
   eventual informação de associação política; tratar com cuidado
   especial sob a LGPD e não equiparar aceite a fundamento automático.
2. DDL candidata isolada, reversão segura, migração não destrutiva,
   RLS `DENY` por omissão, privilégios mínimos e busca de políticas
   recursivas ou funções com privilégios elevados.
3. Prova com Auth A/B e núcleos X/Y reais em banco descartável:
   A vê apenas seus recibos, B não vê os de A; um revisor não
   lê pedidos fora de escopo, não aprova a si e perde autoridade após
   revogação, saída, suspensão ou expiração.
4. Ataques por JWT antigo, URL conhecida, enumeração, PostgREST
   direto, cache PWA e serviço privilegiado. Saída mantém recibo
   próprio mínimo, mas encerra dados e poderes organizativos.
5. Aceite expresso de mandato e de proposta de suplência devem
   ser eventos independentes; nunca transferir funções, acesso ou
   documentos automaticamente, e nunca converter grupo de trabalho
   em núcleo.
6. Prova de limpeza das contas/linhas/imagens descartáveis. Registrar
   resultado do SHA exato, sem transferir SUCCESS de ancestral.
7. Revisão de interface acessível, compreensão, saída e devolução
   voluntária por pessoas reais **antes** de liberação.

**Portão de decisão:** M7.C (migration/RLS), M7.D (percurso autenticado)
e M7.E (ensaio humano) ficam bloqueados até autorização e revisão
separadas. Nenhuma flag de núcleos será ativada nesse incremento.
