-- Closing a trip and reopening it, and the snapshot the closing leaves behind.
--
-- Ana fronts a 120.00 dinner for the three of them, Beto rents a van for 300.00 and asks nobody to
-- share it, and Beto has already handed Ana 25.00 of what he owes:
--
--   Ana   = 120.00 paid - 40.00 charged - 25.00 collected  = +55.00
--   Beto  =   0.00 paid - 40.00 charged + 25.00 handed over = -15.00
--   Carla =   0.00 paid - 40.00 charged                     = -40.00

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,   admin of Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto,  Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, Iceland
             ('44444444-4444-4444-4444-444444444444'::uuid)    -- Dani,  admin of Porto
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000b', '44444444-4444-4444-4444-444444444444', 'Dani',  'admin');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;
select public.create_expense(
    p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
    p_description => 'Dinner', p_amount_cents => 12000, p_spent_on => '2026-07-01') \g /dev/null

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;
select public.create_expense(
    p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
    p_description => 'Van rental', p_amount_cents => 30000, p_type => 'contribution',
    p_spent_on => '2026-07-02') \g /dev/null
select public.record_payment(
    p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
    p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
    p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
    p_amount_cents => 2500) \g /dev/null

-- ---------------------------------------------------------------------------- who may close it
select throws_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    '42501', null, 'a participant does not close the trip');

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    '42501', null, 'and neither does an organiser of another trip');

-- --------------------------------------------------------------------------------- Ana closes it
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'the organiser closes the trip');

select is(
    (select status from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    'closed',
    'which leaves it closed');

select is(
    (select summary->>'total_cents' from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    '42000',
    'and freezes what the trip cost in all');

select is(
    (select array[summary->>'shared_cents', summary->>'contributions_cents'] from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array['12000', '30000'],
    'split into what was shared and what was somebody''s treat');

select is(
    (select summary->>'cost_per_person_cents' from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    '4000',
    'the cost per person dividing the shared spending only');

select is(
    (select array[summary->>'expense_count', summary->>'participant_count'] from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array['2', '3'],
    'with the number of expenses and of travellers');

select is(
    (select array_agg((x->>'net_cents')::bigint)
     from public.trips t, jsonb_array_elements(t.summary->'participants') x
     where t.id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[5500, -1500, -4000]::bigint[],
    'and the final balance of each of them, by name');

select is(
    (select array[x->>'description', x->>'payer_name', x->>'amount_cents']
     from public.trips t, jsonb_array_elements(t.summary->'contributions') x
     where t.id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array['Van rental', 'Beto', '30000'],
    'the contributions are listed with whoever picked up the tab');

select is(
    (select array[x->>'from_name', x->>'to_name', x->>'amount_cents', x->>'voided']
     from public.trips t, jsonb_array_elements(t.summary->'payments') x
     where t.id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array['Beto', 'Ana', '2500', 'false'],
    'and so is every payment already handed over, with its state');

-- ------------------------------------------------------- the snapshot does not follow the tables
create temporary table frozen as
select summary from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a';

reset role;
insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Slipped in',
     5000, 'cccccccc-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-00000000000c');

select is(
    (select summary from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    (select summary from frozen),
    'a change reaching the tables underneath moves nothing in the frozen summary');

select isnt(
    public.trip_summary('aaaaaaaa-0000-0000-0000-00000000000a')->>'total_cents',
    (select summary->>'total_cents' from frozen),
    'though the live figures have moved, which is the whole point of freezing them');

delete from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000f';

-- --------------------------------------------------------------------------- closing and opening
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP014', null, 'a trip already closed is not closed again');

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.reopen_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    '42501', null, 'a participant does not reopen it either');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.reopen_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'the organiser reopens it');

select is(
    (select array[status, (closed_at is null)::text, (summary is null)::text] from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array['open', 'true', 'true'],
    'and the frozen figures go with the closing, since the trip takes changes again');

select throws_ok(
    $$select public.reopen_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP014', null, 'a trip already open is not reopened');

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Airport coffee', p_amount_cents => 900)$$,
    'a reopened trip takes expenses again');

select lives_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'and closing it a second time');

select is(
    (select summary->>'total_cents' from public.trips
     where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    '42900',
    'writes the summary afresh, this time counting what was recorded in between');

select is(
    (select array_agg((x->>'net_cents')::bigint)
     from public.trips t, jsonb_array_elements(t.summary->'participants') x
     where t.id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[6100, -1800, -4300]::bigint[],
    'with the balances that go with it');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'trip.closed'),
    2::bigint,
    'both closings are in the activity feed');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'trip.reopened'),
    1::bigint,
    'and so is the reopening');

-- -------------------------------------------------------- a trip cannot be closed without figures
reset role;
select throws_ok(
    $$update public.trips set status = 'closed', closed_at = now(), summary = null
      where id = 'aaaaaaaa-0000-0000-0000-00000000000b'$$,
    '23514', null, 'no trip is closed by hand and left without a summary');

select * from finish();
rollback;
