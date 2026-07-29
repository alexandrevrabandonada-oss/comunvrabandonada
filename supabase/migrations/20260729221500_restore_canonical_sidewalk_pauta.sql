begin;

-- Restaura somente a âncora editorial exigida pelo fluxo operacional das
-- Calçadas. A migration histórica está registrada no remoto, mas a linha
-- canônica deixou de existir; nenhuma contribuição é criada por este reparo.
insert into public.comun_pauta_spaces (
  slug,
  title,
  summary,
  category,
  community,
  status,
  visibility,
  public_synthesis,
  next_step,
  public_status,
  problem_public,
  demand_public,
  participation_public
)
values (
  'calcadas-em-circulacao',
  'Calçadas em Circulação — Mapa Popular das Calçadas',
  'Processo coletivo para registrar, verificar e encaminhar barreiras de acessibilidade.',
  'sidewalk_accessibility',
  'cidade',
  'organizing',
  'public',
  'Registros aparecem somente depois de revisão editorial e sanitização.',
  'Registrar e revisar situações no Mapa das Calçadas.',
  'investigating',
  'Barreiras em calçadas dificultam a circulação segura.',
  'Documentar e construir prioridades auditáveis sem inferir cobertura completa.',
  'Explore o mapa ou envie um registro para revisão.'
)
on conflict (slug) do nothing;

do $assert_canonical_sidewalk_pauta$
begin
  if not exists (
    select 1
    from public.comun_pauta_spaces
    where slug = 'calcadas-em-circulacao'
      and visibility = 'public'
  ) then
    raise exception 'COMUN_SIDEWALK_CANONICAL_PAUTA_NOT_RESTORED';
  end if;
end
$assert_canonical_sidewalk_pauta$;

commit;
