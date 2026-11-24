-- Ejecutar UNA vez en Supabase > SQL Editor (tras crear tu usuario).
create table if not exists public.studio_owner(id uuid primary key);
insert into public.studio_owner(id) select id from auth.users order by created_at limit 1 on conflict do nothing;
alter table public.studio_owner enable row level security;
revoke all on public.studio_owner from anon,authenticated;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.studio_owner where id=auth.uid()) $$;
grant execute on function public.is_owner() to authenticated;
do $$ declare t text; begin foreach t in array array['posts','post_types','categories','templates','backgrounds','product_presets','campaigns','campaign_items'] loop
execute format('drop policy if exists studio_open on public.%I',t);
execute format('drop policy if exists studio_auth on public.%I',t);
execute format('revoke all on public.%I from anon',t);
execute format('create policy studio_auth on public.%I for all to authenticated using(public.is_owner()) with check(public.is_owner())',t);
end loop; end $$;
drop policy if exists studio_files on storage.objects;
drop policy if exists studio_read on storage.objects;
drop policy if exists studio_write on storage.objects;
create policy studio_read on storage.objects for select to anon,authenticated using(bucket_id='studio');
create policy studio_write on storage.objects for all to authenticated using(bucket_id='studio' and public.is_owner()) with check(bucket_id='studio' and public.is_owner());
revoke execute on function public.claim_item(text),public.fail_stale() from anon,public;
grant execute on function public.claim_item(text),public.fail_stale() to authenticated;
revoke all on function public.queue_pending() from public;
grant execute on function public.queue_pending() to anon,authenticated;
create or replace function public.claim_item(worker text) returns setof public.campaign_items language plpgsql security definer set search_path=public as $$
declare r public.campaign_items;
begin
if not public.is_owner() then return; end if;
select i.* into r from public.campaign_items i join public.campaigns c on c.id=i.campaign_id where c.status='running' and i.attempts<3 and (i.status='pending' or (i.status in('downloading','removing_bg','analyzing','background','composing','saving') and i.locked_at<now()-interval '15 minutes')) order by c.created_at,i.pos for update of i skip locked limit 1;
if not found then return; end if;
update public.campaign_items set status='downloading',attempts=attempts+1,locked_at=now(),locked_by=worker,error=null where id=r.id returning * into r;
return next r;
end $$;
create or replace function public.fail_stale() returns int language plpgsql security definer set search_path=public as $$ declare n int; begin if not public.is_owner() then return 0; end if; with u as (update public.campaign_items set status='error',error=coalesce(error,'Reintentos agotados') where attempts>=3 and status in('pending','downloading','removing_bg','analyzing','background','composing','saving') and (status='pending' or locked_at<now()-interval '15 minutes') returning 1) select count(*) into n from u; return n; end $$;
revoke execute on function public.claim_item(text),public.fail_stale() from anon,public;
grant execute on function public.claim_item(text),public.fail_stale() to authenticated;
