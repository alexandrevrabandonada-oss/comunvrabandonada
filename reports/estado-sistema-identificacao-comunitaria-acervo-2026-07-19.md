# Estado do sistema comunitário de identificação do acervo

**Data da verificação:** 19 de julho de 2026  
**Ambiente:** produção — `https://comunsocial.online`  
**Campanha:** Memórias de Volta Redonda em identificação  
**Estado:** aberta

## Resultado

O sistema comunitário de identificação foi implementado, migrado e publicado. A campanha contém exatamente 860 fichas: 859 fotografias possuem derivada WebP pública, aprovada, reconciliada e sem EXIF; uma fotografia tecnicamente corrompida permanece preservada como original privado e aparece com o estado explícito `restoration_required`.

Os originais não foram publicados. A autorização operacional informada pelo responsável foi registrada na campanha, enquanto autoria e licença permanecem desconhecidas. As interfaces públicas apresentam o aviso permanente “Autoria e contexto em identificação” e acesso aos fluxos de crédito, correção e retirada.

## Entregas

- galeria pública em `/comun/acervo/identificar`, com busca, filtros, paginação e 24 itens por página;
- ficha individual com perguntas de pesquisa, comentários aprovados, síntese editorial e divergências abertas;
- comentário, resposta, denúncia e retirada como ações autenticadas e server-side;
- pré-moderação integral, nome de perfil congelado no envio e apenas um nível de respostas;
- limites de 5 envios por hora e 30 por dia, com auditoria sanitizada;
- denúncias críticas com ocultação preventiva;
- fila administrativa priorizada por risco e idade, acesso privado ao original para equipe autorizada e controle de pausa;
- integração das contribuições com Minha participação e Caixa de entrada;
- separação explícita entre comentários comunitários, síntese editorial e dúvidas/divergências;
- RLS nas tabelas operacionais, sem escrita pública direta e sem chave de serviço no cliente;
- processamento idempotente e reconciliação antes da abertura.

## Inventário reconciliado

| Indicador | Resultado |
|---|---:|
| Fichas da campanha | 860 |
| Fichas abertas com prévia válida | 859 |
| Fichas com restauração pendente | 1 |
| Jobs concluídos | 859 |
| Jobs em retry | 0 |
| Dead-letters | 0 |
| Derivadas públicas aprovadas | 859 |
| Originais públicos | 0 |

## Segurança e direitos

- bucket dos originais permanece privado;
- bucket público aceita somente `image/webp` e é usado exclusivamente para derivadas seguras;
- HTML público verificado sem nomes de campos privados, IDs de usuário, notas editoriais, chaves ou caminhos do bucket privado;
- navegador não escreve diretamente nas tabelas operacionais;
- texto original de uma contribuição fica privado; somente a versão pública sanitizada pode aparecer;
- contribuição rejeitada não é publicada, e retirada remove seu conteúdo público mantendo apenas o marcador estrutural quando necessário;
- contribuição aprovada não altera automaticamente a síntese editorial;
- nenhuma credencial foi gravada no repositório ou incluída neste relatório.

## Operação do lançamento

O processamento foi executado em lotes protegidos. Uma chamada excedeu a duração máxima da função perto do fim e uma rotação operacional recebeu inicialmente uma quebra de linha, causando respostas 401. Nenhuma das ocorrências corrompeu dados: a fila idempotente preservou o progresso, o segredo foi rotacionado corretamente e os lotes seguintes concluíram sem retry ou dead-letter.

A reconciliação final confirmou `ready=859`, `restoration_required=1`, `pending=0` e `can_open=true`; somente depois disso o estado da campanha passou de `processing` para `open`.

## Verificações

- lint, TypeScript, testes unitários e build Next.js 16.2.10: aprovados;
- matriz RLS e smoke de integração Supabase: aprovados;
- migração remota e lint do banco: aprovados;
- galeria pública: HTTP 200;
- ficha pública de amostra: HTTP 200;
- derivada de amostra: HTTP 200 e `Content-Type: image/webp`;
- aviso de autoria/contexto: presente;
- visitante encontra direcionamento para login ao tentar contribuir;
- marcadores privados no HTML inspecionado: zero;
- deploy Vercel de produção e alias `comunsocial.online`: ativos.

## Riscos e acompanhamento

- acompanhar pedidos de crédito, correção e retirada desde o primeiro dia;
- revisar prioritariamente contribuições sobre pessoas, menores, autoria, acusações e dados pessoais;
- monitorar volume, tempo de moderação, denúncias, retiradas e taxa de incorporação editorial;
- tentar restaurar tecnicamente a fotografia bloqueada sem substituir o original;
- manter a autoria como desconhecida até confirmação editorial documentada.

## Commits de implementação

- `bf1f953` — sistema comunitário, interfaces, moderação, dados, scripts e testes;
- `c76b933` — suporte seguro ao storage Supabase remoto para as derivadas.
