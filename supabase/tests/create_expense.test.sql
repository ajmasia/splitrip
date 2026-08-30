-- Recording an expense: the split it produces, and every case it must refuse.
--
-- Iceland has four participants, so the default split divides exactly; Porto has five, which is
-- where a dinner attended by only three of them gets tested.

begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,   admin of Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto,  Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, Iceland
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- Dani,  Iceland
             ('55555555-5555-5555-5555-555555555555'::uuid),   -- Elena, admin of Porto
             ('66666666-6666-6666-6666-666666666666'::uuid),   -- Fran,  Porto
             ('77777777-7777-7777-7777-777777777777'::uuid),   -- Gemma, Porto
             ('88888888-8888-8888-8888-888888888888'::uuid),   -- Hugo,  Porto
             ('99999999-9999-9999-9999-999999999999'::uuid)    -- Iris,  Porto
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000a', '44444444-4444-4444-4444-444444444444', 'Dani',  'participant'),
    ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000b', '55555555-5555-5555-5555-555555555555', 'Elena', 'admin'),
    ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000b', '66666666-6666-6666-6666-666666666666', 'Fran',  'participant'),
    ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000000b', '77777777-7777-7777-7777-777777777777', 'Gemma', 'participant'),
    ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-00000000000b', '88888888-8888-8888-8888-888888888888', 'Hugo',  'participant'),
    ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-00000000000b', '99999999-9999-9999-9999-999999999999', 'Iris',  'participant');

-- ------------------------------------------------------------------- Ana, on a four-person trip
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Dinner',
        p_amount_cents => 6000)$$,
    'a participant records an expense with nothing but a description and an amount');

select is(
    (select array_agg(s.amount_cents order by s.participant_id)
     from public.expense_shares s join public.expenses e on e.id = s.expense_id
     where e.description = 'Dinner'),
    array[1500, 1500, 1500, 1500]::bigint[],
    '60.00 among the four of them charges 15.00 to each');

select is(
    (select paid_by from public.expenses where description = 'Dinner'),
    'cccccccc-0000-0000-0000-00000000000a'::uuid,
    'the payer defaults to whoever records the expense');

select is(
    (select spent_on from public.expenses where description = 'Dinner'),
    current_date,
    'the date defaults to today');

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Taxi',
        p_amount_cents => 1000,
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000a',
                                         'cccccccc-0000-0000-0000-00000000000b',
                                         'cccccccc-0000-0000-0000-00000000000c']::uuid[])$$,
    'an expense can be split among a subset of the trip');

select is(
    (select array_agg(s.amount_cents order by s.participant_id)
     from public.expense_shares s join public.expenses e on e.id = s.expense_id
     where e.description = 'Taxi'),
    array[334, 333, 333]::bigint[],
    '10.00 among three leaves a cent over, and it goes to the first participant by identifier');

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Museum',
        p_amount_cents => 3000,
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000b',
                                         'cccccccc-0000-0000-0000-00000000000c']::uuid[])$$,
    'the payer can be left out of the split of what they paid');

select is(
    (select array_agg(s.amount_cents order by s.participant_id)
     from public.expense_shares s join public.expenses e on e.id = s.expense_id
     where e.description = 'Museum'),
    array[1500, 1500]::bigint[],
    '30.00 among the two of them charges 15.00 to each');

select is_empty(
    $$select 1 from public.expense_shares s join public.expenses e on e.id = s.expense_id
      where e.description = 'Museum' and s.participant_id = 'cccccccc-0000-0000-0000-00000000000a'$$,
    'and charges nothing to the payer, who is left with the whole amount as credit');

create temporary table balance_before_the_contribution as
select net_cents from public.participant_balances
where participant_id = 'cccccccc-0000-0000-0000-00000000000a';

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Van rental',
        p_amount_cents => 30000,
        p_type => 'contribution')$$,
    'a contribution is recorded without a split');

select is_empty(
    $$select 1 from public.expense_shares s join public.expenses e on e.id = s.expense_id
      where e.description = 'Van rental'$$,
    'and leaves no share behind');

select is(
    (select net_cents from public.participant_balances
     where participant_id = 'cccccccc-0000-0000-0000-00000000000a'),
    (select net_cents from balance_before_the_contribution),
    'a contribution changes nobody''s balance, its payer''s included');

select is(
    (select sum(amount_cents)::bigint from public.expenses
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    40000::bigint,
    'but it does add to what the trip has cost');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'expense.created'),
    4::bigint,
    'every expense leaves its entry in the activity feed');

-- --------------------------------------------------------------------------- what it must refuse
select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Van rental, split',
        p_amount_cents => 30000,
        p_type => 'contribution',
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000b']::uuid[])$$,
    'SP004', null, 'a contribution cannot be given a split');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Split among nobody',
        p_amount_cents => 1000,
        p_split_participant_ids => array[]::uuid[])$$,
    'SP005', null, 'a shared expense must be split among at least one person');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Split with an outsider',
        p_amount_cents => 1000,
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000b',
                                         'dddddddd-0000-0000-0000-000000000002']::uuid[])$$,
    'SP006', null, 'the split cannot reach somebody who is not on the trip');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Paid by an outsider',
        p_amount_cents => 1000,
        p_paid_by => 'dddddddd-0000-0000-0000-000000000002')$$,
    'SP007', null, 'nor can the payer be somebody from another trip');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Free',
        p_amount_cents => 0)$$,
    'SP002', null, 'an expense of zero is not an expense');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Refund',
        p_amount_cents => -1000)$$,
    'SP002', null, 'and neither is a negative one');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Souvenir',
        p_amount_cents => 1000,
        p_currency => 'USD')$$,
    'SP003', null, 'this release operates in euros only');

-- ------------------------------------------------------------------- Elena, on a five-person trip
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000b',
        p_description => 'Dinner for three',
        p_amount_cents => 4500,
        p_split_participant_ids => array['dddddddd-0000-0000-0000-000000000002',
                                         'dddddddd-0000-0000-0000-000000000003',
                                         'dddddddd-0000-0000-0000-000000000004']::uuid[])$$,
    'a dinner three of the five attended');

select is(
    (select array_agg(s.amount_cents order by s.participant_id)
     from public.expense_shares s join public.expenses e on e.id = s.expense_id
     where e.description = 'Dinner for three'),
    array[1500, 1500, 1500]::bigint[],
    '45.00 among three of the five charges 15.00 to each of them');

select is_empty(
    $$select 1 from public.expense_shares s join public.expenses e on e.id = s.expense_id
      where e.description = 'Dinner for three'
        and s.participant_id in ('dddddddd-0000-0000-0000-000000000001',
                                 'dddddddd-0000-0000-0000-000000000005')$$,
    'and leaves the other two untouched');

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Not my trip',
        p_amount_cents => 1000)$$,
    '42501', null, 'somebody from another trip cannot record an expense here');

-- ---------------------------------------------------------------------- once the trip is closed
reset role;
update public.trips set status = 'closed', closed_at = now(), summary = '{}'::jsonb
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Too late',
        p_amount_cents => 1000)$$,
    'SP001', null, 'a closed trip accepts no new expense, not even from its organiser');

select * from finish();
rollback;
