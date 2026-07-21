# Deep links — Sprint 40

Rotas canônicas verificadas no código:

- comunidade: `/comun/c/[slug]`;
- pauta: `/comun/pautas/[slug]`;
- miniapp: `/comun/calcadas`;
- registro: `/comun/calcadas/registros/[slug]`;
- prioridade: `/comun/calcadas/prioridades?prioridade=[id]`;
- resultado: `/comun/resultados?resultado=[slug]`;
- memória: `/comun/pautas/[slug]/memoria/[memorySlug]`;
- evento de Inbox: usa o `destination` canônico projetado.

Compatibilidade: `/comun/pautas/[slug]/registros/[recordSlug]` redireciona permanentemente à ficha canônica; `/comun/busca` redireciona permanentemente para `/comun/buscar`, preservando parâmetros.

A trilha contextual não depende de visita anterior à Home.

Gate automatizado: rotas canônicas percorridas em cinco viewports, sem falha de contexto, overflow ou acessibilidade serious/critical.
