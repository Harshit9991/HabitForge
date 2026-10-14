-- Run with `supabase test db` against a local project.
begin;
select plan(8);

select has_table('public', 'journeys');
select has_table('public', 'habits');
select has_table('public', 'daily_habit_entries');
select has_table('public', 'daily_notes');
select has_table('public', 'operation_receipts');
select policies_are('public', 'journeys', array['journeys_owner_select', 'journeys_owner_insert', 'journeys_owner_update', 'journeys_owner_delete']);
select policies_are('public', 'habits', array['habits_owner_all']);
select policies_are('public', 'daily_notes', array['notes_owner_all']);

select * from finish();
rollback;
