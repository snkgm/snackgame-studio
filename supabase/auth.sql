do $$ declare t text; begin foreach t in array array['posts','post_types','categories','templates','backgrounds','product_presets','campaigns','campaign_items'] loop
execute format('drop policy if exists studio_open on public.%I',t);
execute format('drop policy if exists studio_auth on public.%I',t);
execute format('revoke all on public.%I from anon',t);
execute format('create policy studio_auth on public.%I for all to authenticated using(true) with check(true)',t);
end loop; end $$;
drop policy if exists studio_files on storage.objects;
drop policy if exists studio_read on storage.objects;
drop policy if exists studio_write on storage.objects;
create policy studio_read on storage.objects for select to anon,authenticated using(bucket_id='studio');
create policy studio_write on storage.objects for all to authenticated using(bucket_id='studio') with check(bucket_id='studio');
revoke execute on function public.claim_item(text),public.fail_stale() from anon;
