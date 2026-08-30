-- A closed trip is read-only, checked in one place across every way there is of writing to one.
--
-- Ana is the organiser, which is the strongest hand the trip has: if she cannot, nobody can. The
-- one change a closed trip accepts is being reopened, and the last two checks are that it does.

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,  admin of Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, on the trip, owing nothing
             ('44444444-4444-4444-4444-444444444444'::uuid)    -- somebody holding an invitation
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant');

insert into public.invitations (id, trip_id, token, created_by) values
    ('bbbbbbbb-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Zx8Kq2mB7vN4pR1sT6wY9a', '11111111-1111-1111-1111-111111111111');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select public.create_expense(
    p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
    p_description => 'Dinner', p_amount_cents => 6000) \g /dev/null
select public.record_payment(
    p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
    p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
    p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
    p_amount_cents => 1000) \g /dev/null

create temporary table dinner as select id from public.expenses where description = 'Dinner';
create temporary table handover as select id from public.payments where amount_cents = 1000;

select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a') \g /dev/null

-- ------------------------------------------------------------- the functions that write anything
select throws_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Too late', p_amount_cents => 100)$$,
    'SP001', null, 'no expense is recorded on a closed trip');

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner), p_amount_cents => 100)$$,
    'SP001', null, 'nor corrected');

select throws_ok(
    $$select public.delete_expense((select id from dinner))$$,
    'SP001', null, 'nor deleted');

select throws_ok(
    $$select public.record_payment(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_from_participant_id => 'cccccccc-0000-0000-0000-00000000000b',
        p_to_participant_id => 'cccccccc-0000-0000-0000-00000000000a',
        p_amount_cents => 100)$$,
    'SP001', null, 'no payment is recorded');

select throws_ok(
    $$select public.void_payment((select id from handover))$$,
    'SP001', null, 'and none is voided');

select throws_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP014', null, 'the trip is not closed a second time');

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Late arrival')$$,
    'SP001', null, 'and an invitation to it brings nobody in');

-- --------------------------------------------------------- the writes that still go by policy
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

update public.trips set name = 'Iceland 2027'
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is(
    (select name from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    'Iceland 2026',
    'a closed trip is not renamed');

update public.participants set role = 'admin'
where id = 'cccccccc-0000-0000-0000-00000000000b';
select is(
    (select role from public.participants where id = 'cccccccc-0000-0000-0000-00000000000b'),
    'participant',
    'no role changes hands');

delete from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c';
select isnt_empty(
    $$select 1 from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c'$$,
    'nobody is removed from it, not even somebody owing nothing');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP001', null, 'no new invitation is issued');

update public.invitations set revoked_at = now()
where id = 'bbbbbbbb-0000-0000-0000-00000000000a';
select is(
    (select revoked_at from public.invitations where id = 'bbbbbbbb-0000-0000-0000-00000000000a'),
    null,
    'and the ones it has are not revoked either');

-- ------------------------------------------------------------------- what a closed trip accepts
select lives_ok(
    $$select public.reopen_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'the organiser reopens it, which is the one change it takes');

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Airport coffee', p_amount_cents => 900)$$,
    'and it records expenses again');

select is(
    (select count(*) from public.expenses
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    2::bigint,
    'so nothing the closed trip refused was quietly let through');

select * from finish();
rollback;
