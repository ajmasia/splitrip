-- Settling up: recording money handed from one participant to another, and voiding a payment that
-- should never have been recorded.
--
-- Ana fronts a 120.00 dinner for the three of them, so Beto and Carla owe her 40.00 each. Beto
-- hands over 25.00 of it, which is a partial payment like any other: nothing here knows what he
-- owed, and his balance simply moves by what he paid.

begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Dinner',
        p_amount_cents => 12000)$$,
    'Ana fronts a 120.00 dinner, leaving the other two 40.00 down each');

-- ------------------------------------------------------------------------ Beto pays part of it
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 2500)$$,
    'Beto hands Ana 25.00 of the 40.00 he owes her');

create temporary table betos_payment as
select id from public.payments where amount_cents = 2500;

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[5500, -1500, -4000]::bigint[],
    'which leaves him 15.00 down and reduces what Ana is owed by the same amount');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'payment.recorded'),
    1::bigint,
    'and the payment is traced in the activity feed');

-- --------------------------------------------------------------------------- what it must refuse
select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_amount_cents => 1000)$$,
    'SP008', null, 'nobody pays themselves');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 0)$$,
    'SP002', null, 'a payment of nothing is not a payment');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => -2500)$$,
    'SP002', null, 'and neither is a negative one');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'dddddddd-0000-0000-0000-000000000001',
        p_amount_cents => 1000)$$,
    'SP007', null, 'money cannot be paid to somebody on another trip');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'dddddddd-0000-0000-0000-000000000001',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 1000)$$,
    'SP007', null, 'nor received from one');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 1000,
        p_currency => 'USD')$$,
    'SP003', null, 'and it changes hands in euros');

-- --------------------------------------------------------------------------- Dani, another trip
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 1000)$$,
    '42501', null, 'somebody from another trip records nothing here');

-- ------------------------------------------------------------------------------------- voiding
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.void_payment((select id from betos_payment))$$,
    '42501', null, 'a participant cannot void a payment somebody else recorded');

select lives_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000c',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 1000)$$,
    'Carla hands Ana 10.00');

create temporary table carlas_payment as
select id from public.payments where amount_cents = 1000;

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.void_payment((select id from betos_payment))$$,
    'Beto voids the payment he recorded, having handed over nothing after all');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[7000, -4000, -3000]::bigint[],
    'and both sides of it are put back where they were');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'payment.voided'),
    1::bigint,
    'the voiding leaves its own trace, and the payment stays on the record');

select throws_ok(
    $$select public.void_payment((select id from betos_payment))$$,
    'SP009', null, 'a payment already voided cannot be voided twice');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.void_payment((select id from carlas_payment))$$,
    'an admin voids a payment recorded by somebody else');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[8000, -4000, -4000]::bigint[],
    'leaving the trip owing exactly what it owed before anybody settled up');

-- ---------------------------------------------------------------------- once the trip is closed
reset role;
insert into public.payments (id, trip_id, from_participant_id, to_participant_id, amount_cents, created_by) values
    ('ffffffff-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000a', 500,
     'cccccccc-0000-0000-0000-00000000000b');
update public.trips set status = 'closed', closed_at = now()
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 1000)$$,
    'SP001', null, 'a closed trip records no payment');

select throws_ok(
    $$select public.void_payment('ffffffff-0000-0000-0000-00000000000f')$$,
    'SP001', null, 'and voids none');

select * from finish();
rollback;
