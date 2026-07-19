alter table public.comun_sidewalk_records add column if not exists member_user_id uuid references auth.users(id) on delete set null;
create index if not exists comun_sidewalk_records_member_idx on public.comun_sidewalk_records(member_user_id,created_at desc) where member_user_id is not null;
create policy "member_reads_own_sidewalk_records" on public.comun_sidewalk_records for select to authenticated using ((select auth.uid())=member_user_id);
comment on column public.comun_sidewalk_records.member_user_id is 'Private ownership link. Never expose in public queries or HTML.';
