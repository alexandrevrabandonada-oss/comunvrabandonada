# Sistema visual do COMUN

## Princípios

Familiaridade na interação, originalidade na organização. Contraste direto, densidade profissional, linguagem humana e ação principal inequívoca.

## Tokens

| Grupo | Token | Valor/uso |
|---|---|---|
| cor | ink | `#0b0b0a`, texto e borda principal |
| cor | asphalt | `#171816`, superfícies escuras |
| cor | paper | `#f4efe4`, fundo claro |
| cor | action | `#f4c400`, ação/estado que requer atenção |
| cor | secondary | `#6d6a63`, metadado |
| cor | error | `#c6251d` |
| cor | success | `#228b45` |
| tipografia | display | 900, `clamp(2.25rem, 6vw, 4.5rem)`, linha 0,95 |
| tipografia | page | 900, `clamp(2rem, 5vw, 3.75rem)`, linha 1 |
| tipografia | section | 900, 1,5–2rem, linha 1,1 |
| tipografia | entity | 800, 1,125–1,5rem, escrita normal |
| tipografia | body | 400–500, 1rem, linha 1,55 |
| tipografia | small | 400–700, 0,875rem, linha 1,45 |
| tipografia | label/control | 800–900, 0,75–0,875rem |
| espaço | escala | 4, 8, 12, 16, 24, 32, 48, 64 px |
| raio | sharp | 0 |
| raio | control | 0,5rem |
| raio | sheet | 1rem no topo |
| elevação | none | sem sombra |
| elevação | floating | `0 8px 24px rgb(0 0 0 / 18%)` |
| elevação | modal | `0 16px 48px rgb(0 0 0 / 28%)` |
| motion | fast | 120 ms |
| motion | standard | 160 ms |
| motion | sheet | 200 ms |

## Regras

- amarelo é reservado para ação, foco e estado significativo;
- uma ação primária por superfície;
- caixa-alta somente em títulos principais/de seção, labels críticas e botões curtos;
- títulos de entidades, mensagens e Inbox usam escrita normal;
- controles têm no mínimo 44×44 px; destino principal mobile tem 56 px ou mais;
- ícones pertencem à família Lucide, stroke 2, 18–22 px, sempre com nome acessível quando isolados;
- foco usa outline amarelo de 3 px; reduced motion reduz transições a praticamente zero;
- safe areas são aplicadas ao cabeçalho e à navegação inferior.
