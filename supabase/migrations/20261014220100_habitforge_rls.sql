revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy journeys_owner_select on public.journeys for select to authenticated using (owner_id = auth.uid());
create policy journeys_owner_insert on public.journeys for insert to authenticated with check (owner_id = auth.uid());
create policy journeys_owner_update on public.journeys for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy journeys_owner_delete on public.journeys for delete to authenticated using (owner_id = auth.uid());

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
    where journey_id = p_journey_id and local_date = p_local_date;
  update operation_receipts set state = 'completed', result = jsonb_build_object('date', p_local_date), completed_at = now()
    where operation_id = p_operation_id and owner_id = auth.uid();
  return jsonb_build_object('operation_id', p_operation_id, 'state', 'completed', 'date', p_local_date);
end;
$$;

revoke execute on function public.mark_all_for_date(uuid, date, uuid, text) from public, anon;
grant execute on function public.mark_all_for_date(uuid, date, uuid, text) to authenticated;
