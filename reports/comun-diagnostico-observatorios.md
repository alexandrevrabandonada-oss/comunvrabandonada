# Diagnóstico pré-migração — Observatórios Populares

Data: 15/07/2026. Este documento foi concluído antes da migration da Sprint 27.

## Inventário reutilizável

- Pauta central: `comun_pauta_spaces`; ações organizadas, tarefas, evidências, protocolos, resultados e timeline já formam o fluxo do Hub.
- Território: `comun_hub_territories` e o Mapa Popular oferecem referências e geometria pública aproximada; não devem ser substituídos por entidades monitoradas.
- Contribuições: formulários server actions usam Zod/validação explícita, honeypot, hash técnico e limites; entradas públicas passam por moderação.
- Alertas e jobs: `comun_admin_alerts`, fila do Acervo e scheduler já existem. O motor pode reutilizar alertas e execução server-only, sem misturar observações com jobs de mídia.
- Evidências: `comun_pauta_evidence_items` é o destino editorial correto após revisão humana.
- Busca e Sala de Organização: helpers server-side selecionam campos públicos; o painel agrega pendências por consulta paralela.
- Gráficos: não há biblioteca dedicada. A opção de menor custo e bundle é SVG/HTML acessível com tabela equivalente.
- Bibliotecas: Next 16.2.10, React 19.2.7, Zod 3.24.1, Supabase JS 2.110.5, Vitest, Playwright e axe.
- Retenção: há rotinas específicas do Acervo, mas nenhuma política para observações. A Sprint deve registrar retenção editorial e manter contato/payload bruto privados, com arquivamento em vez de publicação automática.

## Lacuna

Não existem metodologia e formulário versionados, validação de payload por versão, verificação de observação, definição segura de métrica, snapshot editorial ou exportação agregada. Criar tabelas temáticas isoladas repetiria segurança e workflow.

## Decisão

Criar um motor único, service-role only, ligado à pauta/projeto/território. Configurações serão JSON limitado e validado, nunca SQL/código. Observações nascerão `pending`; somente `accepted` entrará em agregações idempotentes. Snapshots guardarão metodologia, amostra, período e limitações e só serão públicos após aprovação humana. Transporte será uma especialização relacional do motor comum.

## Segurança e plataforma

As tabelas novas terão RLS, revogação de `anon/authenticated` e grant explícito ao `service_role`, necessário diante da mudança de exposição da Data API anunciada pelo Supabase em 2026. Localização do observador, identidade de passageiros/motoristas e evidência bruta não serão coletadas ou publicadas. O portal consultará listas explícitas de campos sanitizados no servidor.
