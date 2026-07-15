# Diagnóstico public-ui fixtures — Sprint 28.2

O smoke anterior falhava em `/comun/pautas/trabalho-burnout-volta-redonda` porque esperava uma frase editorial associada a dados de uma sessão anterior. `supabase db reset --local` não recria esse conteúdo, pois não é seed estrutural.

A correção é `smoke:public-ui:local`: ele cria uma pauta modular própria, verifica shell, módulos, roda, síntese e ausência de dados privados, e remove a fixture ao final. As assertions usam o contrato da fixture, não conteúdo editorial mutável.
