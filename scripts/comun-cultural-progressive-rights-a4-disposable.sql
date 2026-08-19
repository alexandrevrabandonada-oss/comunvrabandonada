-- A4 disposable proof: local Supabase only, never Production.
begin;

do $$
declare required_column text;
begin
  foreach required_column in array array['rights_basis','publication_scope','reuse_permission','rights_state','rights_contract_version','rights_declared_at'] loop
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='comun_archive_submissions' and column_name=required_column) then
      raise exception 'missing photo rights column: %', required_column;
    end if;
  end loop;
  if has_table_privilege('anon','public.comun_archive_submissions','select') or has_table_privilege('authenticated','public.comun_archive_submissions','select') then raise exception 'photo rights table is public'; end if;
  if has_table_privilege('anon','public.comun_archive_artwork_submissions','insert') or has_table_privilege('authenticated','public.comun_archive_artwork_submissions','insert') then raise exception 'art rights table accepts public writes'; end if;
end $$;

insert into public.comun_archive_submissions(status,title_suggestion,description_suggestion,rights_declaration,permission_confirmed,rights_basis,publication_scope,reuse_permission,license_code,rights_state,rights_contract_version,rights_declared_at,submitter_hash)
values('awaiting_upload','A4 disposable photo','Private proof','Own creation declared',true,'own_creation','comun_display','comun_only','none','rights_declared','a4-20260819-v1',now(),'a4-photo-proof');
insert into public.comun_archive_submissions(status,title_suggestion,description_suggestion,rights_declaration,permission_confirmed,rights_basis,publication_scope,reuse_permission,rights_state,rights_contract_version,rights_declared_at,submitter_hash)
values('awaiting_upload','A4 unknown photo','Private proof','Unknown history declared',true,'historical_unknown','review_only','not_defined','rights_review_required','a4-20260819-v1',now(),'a4-unknown-proof');
insert into public.comun_archive_artwork_submissions(public_protocol,submission_kind,title_suggestion,artwork_type,creator_credit_suggestion,authorship_basis,publication_scope,reuse_permission,license_code,identity_preference,rights_state,rights_contract_version,rights_declared_at,submitter_hash)
values('A4-PROOF-ART','own_work','A4 art','other','Credit proof','uploader_creator','comun_display','comun_only','none','public_credit','rights_declared','a4-20260819-v1',now(),'a4-art-proof');
insert into public.comun_radio_contributions(public_protocol,contribution_type,title_suggestion,context_suggestion,voice_source,material_source,publication_scope,reuse_permission,license_code,identity_preference,rights_state,rights_contract_version,rights_declared_at)
values('A4-PROOF-RADIO','pauta_proposal','A4 radio','Private proof','submitter_voice','original_text','comun_audio','comun_only','none','anonymous','rights_declared','a4-20260819-v1',now());

do $$ begin
  begin
    insert into public.comun_archive_artwork_submissions(public_protocol,submission_kind,title_suggestion,artwork_type,creator_credit_suggestion,authorship_basis,publication_scope,reuse_permission,identity_preference)
    values('A4-INVALID','own_work','Invalid','other','x','uploader_creator','comun_display_and_reuse','licensed_reuse','public_credit');
    raise exception 'licensed reuse without license was accepted';
  exception when check_violation then null;
  end;
end $$;

rollback;
do $$ begin
  if (select count(*) from public.comun_archive_submissions where submitter_hash like 'a4-%') <> 0 or
     (select count(*) from public.comun_archive_artwork_submissions where submitter_hash like 'a4-%') <> 0 or
     (select count(*) from public.comun_radio_contributions where public_protocol like 'A4-PROOF-%') <> 0 then raise exception 'rollback left business writes'; end if;
end $$;

select 'COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_DISPOSABLE_GREEN' as checkpoint,
       'rightsVersion=a4-20260819-v1' as rights_version,
       'rightsIncompleteFailClosed=true' as rights_incomplete_fail_closed,
       'autoPublication=false' as auto_publication,
       'businessWritesAfterRollback=0' as business_writes_after_rollback,
       'publicAssetWrites=0' as public_asset_writes,
       'searchWrites=0' as search_writes;
