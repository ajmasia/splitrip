-- Creating a trip, and what a person sees in their list afterwards.

begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into public.trip_creators (email) values ('ana@splitrip.test'), ('beto@splitrip.test');

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana
             ('22222222-2222-2222-2222-222222222222'::uuid)    -- Beto, who organises elsewhere
     ) as u(id);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"ana@splitrip.test"}';
set local role authenticated;

select lives_ok(
    $$select public.create_trip('Iceland 2026', 'Ana')$$,
    'a trip is created by giving its name and your own');

select is(
    (select array[name, status, currency] from public.trips where name = 'Iceland 2026'),
    array['Iceland 2026', 'open', 'EUR'],
    'and starts open, in euros');

select is(
    (select array[p.display_name, p.role] from public.participants p
     join public.trips t on t.id = p.trip_id where t.name = 'Iceland 2026'),
    array['Ana', 'admin'],
    'with whoever created it as its organiser');

select lives_ok(
    $$select public.create_trip('Porto 2026', '  Ana  ', '2026-09-01', '2026-09-05')$$,
    'dates are optional, and given in order they are kept');

select is(
    (select array[start_date, end_date] from public.trips where name = 'Porto 2026'),
    array['2026-09-01', '2026-09-05']::date[],
    'exactly as they were given');

select is(
    (select display_name from public.participants p
     join public.trips t on t.id = p.trip_id where t.name = 'Porto 2026'),
    'Ana',
    'and the surrounding whitespace of a name is not part of it');

select throws_ok(
    $$select public.create_trip('   ', 'Ana')$$,
    'SP015', null, 'a trip of nothing but spaces has no name');

select throws_ok(
    $$select public.create_trip('Nameless', '   ')$$,
    'SP012', null, 'and its creator needs one too');

select throws_ok(
    $$select public.create_trip('Backwards', 'Ana', '2026-09-05', '2026-09-01')$$,
    'SP016', null, 'a trip cannot end before it starts');

-- ------------------------------------------------------------------------------ the trip list
select is(
    (select array_agg(name order by name) from public.trip_overview),
    array['Iceland 2026', 'Porto 2026'],
    'the list holds the trips this person takes part in');

select public.create_expense(
    p_trip_id => (select id from public.trips where name = 'Iceland 2026'),
    p_description => 'Dinner', p_amount_cents => 6000) \g /dev/null

select is(
    (select array[total_cents, expense_count, participant_count] from public.trip_overview
     where name = 'Iceland 2026'),
    array[6000, 1, 1]::bigint[],
    'with what has been spent on each one');

select public.create_expense(
    p_trip_id => (select id from public.trips where name = 'Iceland 2026'),
    p_description => 'Van rental', p_amount_cents => 30000, p_type => 'contribution') \g /dev/null

select is(
    (select array[total_cents, shared_cents, contributed_cents] from public.trip_overview
     where name = 'Iceland 2026'),
    array[36000, 6000, 30000]::bigint[],
    'told apart from the part of it that is divided among people');

select is(
    (select array[total_cents, expense_count] from public.trip_overview where name = 'Porto 2026'),
    array[0, 0]::bigint[],
    'and zero where nothing has been spent yet');

select is(
    (select array[shared_cents, contributed_cents] from public.trip_overview where name = 'Porto 2026'),
    array[0, 0]::bigint[],
    'both of them');

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"beto@splitrip.test"}';
set local role authenticated;

select is_empty(
    $$select 1 from public.trip_overview$$,
    'somebody with no trips sees an empty list');

select lives_ok(
    $$select public.create_trip('Lisbon 2026', 'Beto')$$,
    'and after creating one');

select is(
    (select array_agg(name) from public.trip_overview),
    array['Lisbon 2026'],
    'sees theirs and nobody else''s');

-- ------------------------------------------------------ who is allowed to open a trip at all
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select throws_ok(
    $$select public.create_trip('From a phone', 'Whoever')$$,
    'SP017', null, 'a device identity opens no trips: joining one is what it is for');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"stranger@example.test"}';
set local role authenticated;

select throws_ok(
    $$select public.create_trip('Not on the list', 'Whoever')$$,
    'SP017', null, 'and neither does an account nobody allowed');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"  ANA@Splitrip.test  "}';
set local role authenticated;

select lives_ok(
    $$select public.create_trip('Shouting the address', 'Ana')$$,
    'an allowed address is recognised whatever its case and spacing');

select * from finish();
rollback;
