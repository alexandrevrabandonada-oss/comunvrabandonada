# Higiene de tipos gerados antes da verificação estática

Quality do #523, head `00153352`, job `113523175532`, passou nas jornadas
e smokes e depois falhou com TS1109/TS1128 em
`.next-miniapp-experience/dev/types/validator.ts`. A origem exata do conteúdo
gerado inválido não foi reproduzida. A limpeza existente retirava apenas
`.next/dev`, embora o miniapp isolado também produza tipos dev selecionados
pelo TypeScript. Não é falha da migration nem ausência de memória pública.

Depois do encerramento dos servidores de desenvolvimento, o CI limpa somente
`.next/dev` e `.next-miniapp-experience/dev`, mantendo fontes e tipos de
produção. Executa `next typegen` para gerar tipos canônicos e mantém o mesmo
TypeScript strict, lint e build. Não altera ignoreBuildErrors, exclusões de
tsconfig, assertions de navegador, etapas remotas ou credenciais.

Três provas com o compilador TypeScript real verificam: validator dev
inválido bloqueia; limpeza permite compilar; erros de aplicação e de tipos
de rotas de produção continuam bloqueando. A geração real de tipos e o
TypeScript da aplicação passaram localmente. O fixture de corrupção é
sintético, não cópia do arquivo que falhou no CI.

Entrega independente baseada em main `e8850cbc`, já certificada pós-merge.
Não incorpora as features bloqueadas do #523. CI próprio, Preview/COST-02 e
conferência pós-merge ainda são necessários. A prova local não os substitui.
Seis gates da Escola, recuperação durável do provedor e aparelhos reais
continuam separados. Nenhuma migration Production, flag ou indexação.
