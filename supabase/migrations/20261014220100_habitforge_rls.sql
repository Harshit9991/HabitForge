revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy journeys_owner_select on public.journeys for select to authenticated using (owner_id = auth.uid());
create policy journeys_owner_insert on public.journeys for insert to authenticated with check (owner_id = auth.uid());
create policy journeys_owner_update on public.journeys for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy journeys_owner_delete on public.journeys for delete to authenticated using (owner_id = auth.uid());

create or replace function public.prevent_journey_boundary_change()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if old.start_date <> new.start_date or old.end_date_exclusive <> new.end_date_exclusive or old.timezone <> new.timezone
    then raise exception 'journey_boundary_immutable'; end if;
  if old.owner_id <> new.owner_id or old.revision > new.revision then
    raise exception 'journey_identity_immutable'; end if;
  return new;
end;
$$;
create trigger journeys_immutable_fields before update on public.journeys
for each row execute function public.prevent_journey_boundary_change();

create policy groups_owner_all on public.habit_groups for all to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()));
create policy habits_owner_all on public.habits for all to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()));
create policy versions_owner_all on public.habit_versions for all to authenticated
  using (exists (select 1 from public.habits h join public.journeys j on j.id = h.journey_id where h.id = habit_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.habits h join public.journeys j on j.id = h.journey_id where h.id = habit_id and j.owner_id = auth.uid()));
create policy entries_owner_all on public.daily_habit_entries for all to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()));
create policy notes_owner_all on public.daily_notes for all to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()));
create policy settings_owner_all on public.user_journey_settings for all to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.owner_id = auth.uid()));
create policy receipts_owner_all on public.operation_receipts for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.mark_all_for_date(
  p_journey_id uuid,
  p_local_date date,
  p_operation_id uuid,
  p_payload_hash text
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from journeys where id = p_journey_id and owner_id = auth.uid() and state = 'active') then
    raise exception 'journey_not_owned';
  end if;
  insert into operation_receipts(operation_id, owner_id, journey_id, payload_hash)
  values (p_operation_id, auth.uid(), p_journey_id, p_payload_hash)
  on conflict (operation_id) do nothing;
  select jsonb_build_object('operation_id', operation_id, 'state', state, 'result', result)
    into result from operation_receipts where operation_id = p_operation_id and owner_id = auth.uid();
  if (result->>'state' = 'completed') then return result; end if;
  update daily_habit_entries set completed = true, revision = revision + 1, updated_at = now()
    where journey_id = p_journey_id and local_date = p_local_date and completed is distinct from true;
  insert into daily_habit_entries (journey_id, habit_id, habit_version_id, local_date, completed)
  select h.journey_id, h.id, hv.id, p_local_date, true
  from habits h
  join lateral (
    select id from habit_versions
    where habit_id = h.id and active_from <= p_local_date
      and (active_until_exclusive is null or p_local_date < active_until_exclusive)
    order by active_from desc limit 1
  ) hv on true
  where h.journey_id = p_journey_id and h.archived_at is null
    and not exists (
      select 1 from daily_habit_entries e
      where e.journey_id = h.journey_id and e.habit_id = h.id and e.local_date = p_local_date
    );
  update operation_receipts set state = 'completed', result = jsonb_build_object('date', p_local_date), completed_at = now()
    where operation_id = p_operation_id and owner_id = auth.uid();
  return jsonb_build_object('operation_id', p_operation_id, 'state', 'completed', 'date', p_local_date);
end;
$$;

revoke execute on function public.mark_all_for_date(uuid, date, uuid, text) from public, anon;
grant execute on function public.mark_all_for_date(uuid, date, uuid, text) to authenticated;
