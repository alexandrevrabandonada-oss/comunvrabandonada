# Jornadas mobile — Sprint 40.1

Cobertura preparada para 360×800, 390×844 e 768×1024:

- Ação direta: deep link Calçadas → captura → confirmação → Minha área.
- Descoberta: Início → Explorar → Território → Pauta → miniapp.
- Organização: Comunidade → Pauta → Prioridade → Mobilização.
- Retorno: Caixa → Registro → Resultado → Memória → Minha área.
- Participação: Participar → action sheet → destino → acompanhamento.

Critérios automatizados: cinco destinos globais, uma navegação local, um CTA, action sheet acessível, nenhum overlay PWA no mapa, zero overflow e zero violações Axe serious/critical.

## Execução

- 9/9 cenários E2E aprovados nos três viewports;
- navegação global: 4 links + ação central Participar = 5 destinos;
- action sheet: cinco caminhos operacionais, cada um com finalidade, exigência de conta e próximo passo;
- Explorar: seis categorias presentes e busca unificada;
- miniapp: navegação local única, CTA “Registrar calçada” único e PWA ausente;
- rotas verificadas pelo gate de acessibilidade: Início, Explorar, Território, Comunidade, Pauta, miniapp e registro;
- gate humano permanece separado e não preenchido.
