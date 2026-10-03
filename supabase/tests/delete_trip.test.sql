-- Deleting a trip for good, who may do it, the name it asks for, and what goes with it.
--
-- Ana organises Iceland, with Beto and Carla on it: a dinner shared by the three, a payment from
-- Beto to Ana and an invitation still out. Ana and Beto are also on Porto, which nothing here may
-- touch, and Ana organises Lisboa, which she closes before deleting it. Dani is on none of them.

begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,   admin of all three
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto,  Iceland and Porto
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, Iceland
             ('44444444-4444-4444-4444-444444444444'::uuid)    -- Dani,  on no trip of these
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000c', 'Lisboa 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('dddddddd-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('dddddddd-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin');

insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('ffffffff-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Dinner',
     9000, 'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a'),
    ('ffffffff-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Port tasting',
     4000, 'dddddddd-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000a'),
    ('ffffffff-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000c', 'Tram passes',
     1500, 'eeeeeeee-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a');

insert into public.expense_shares (expense_id, participant_id, amount_cents) values
    ('ffffffff-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 3000),
    ('ffffffff-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b', 3000),
    ('ffffffff-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000c', 3000),
    ('ffffffff-0000-0000-0000-00000000000b', 'dddddddd-0000-0000-0000-00000000000a', 2000),
    ('ffffffff-0000-0000-0000-00000000000b', 'dddddddd-0000-0000-0000-00000000000b', 2000),
    ('ffffffff-0000-0000-0000-00000000000c', 'eeeeeeee-0000-0000-0000-00000000000a', 1500);

insert into public.payments (trip_id, from_participant_id, to_participant_id, amount_cents, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b',
     'cccccccc-0000-0000-0000-00000000000a', 1000, 'cccccccc-0000-0000-0000-00000000000b'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'dddddddd-0000-0000-0000-00000000000b',
     'dddddddd-0000-0000-0000-00000000000a', 500, 'dddddddd-0000-0000-0000-00000000000b');

insert into public.invitations (trip_id, token, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'iceland-invitation-token-0001', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'porto-invitation-token-000001', '11111111-1111-1111-1111-111111111111');

-- What a trip holds, counted the same way before and after, so "left in place" is one comparison.
create function pg_temp.holdings(p_trip_id uuid)
returns bigint[]
language sql
as $$
    select array[
        (select count(*) from public.trips where id = p_trip_id),
        (select count(*) from public.participants where trip_id = p_trip_id),
        (select count(*) from public.expenses where trip_id = p_trip_id),
        (select count(*) from public.expense_shares s
           join public.expenses e on e.id = s.expense_id where e.trip_id = p_trip_id),
        (select count(*) from public.payments where trip_id = p_trip_id),
        (select count(*) from public.activity where trip_id = p_trip_id),
        (select count(*) from public.invitations where trip_id = p_trip_id)
    ];
$$;

create temporary table before_iceland as select pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000a') as h;
create temporary table before_porto as
select pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000b') as h,
       (select array_agg(net_cents order by participant_id) from public.participant_balances
         where participant_id in ('dddddddd-0000-0000-0000-00000000000a',
                                  'dddddddd-0000-0000-0000-00000000000b')) as nets;

select ok(
    (select h[6] > 0 from before_iceland),
    'Iceland starts with activity in its feed, so its going is something to check');

-- --------------------------------------------------------------------------------- who may delete
select is(has_function_privilege('anon', 'public.delete_trip(uuid, text)', 'execute'), false,
    'nobody signed out may call it');

select is(has_function_privilege('authenticated', 'public.delete_trip(uuid, text)', 'execute'), true,
    'a signed-in caller may, and the function decides the rest');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026')$$,
    '42501', null, 'a participant does not delete the trip');

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026')$$,
    '42501', null, 'and neither does somebody who is not on it');

-- ------------------------------------------------------------------------------- the name it asks
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland')$$,
    'SP030', null, 'the organiser is refused when the name is only part of the trip''s');

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', 'Porto 2026')$$,
    'SP030', null, 'and when it is the name of another trip of theirs');

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', null)$$,
    'SP030', null, 'and when there is no name at all');

reset role;
select is(
    pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000a'),
    (select h from before_iceland),
    'every refusal leaves the trip and everything in it where it was');

-- ------------------------------------------------------------------------------- Ana deletes it
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000a', '  iceland 2026 ')$$,
    'the organiser deletes an open trip, the name typed in another case and with spaces around it');

-- The references to participants are deferred until commit, and this transaction never commits:
-- checked now, they would refuse anything the cascade had left pointing at a participant.
select lives_ok(
    $$set constraints all immediate$$,
    'and the cascade leaves nothing that still points at one of its participants');

reset role;
select is(
    pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000a'),
    array[0, 0, 0, 0, 0, 0, 0]::bigint[],
    'and nothing of it remains: trip, participants, expenses, shares, payments, activity, invitations');

select is(
    (select count(*) from public.expense_shares
      where participant_id in ('cccccccc-0000-0000-0000-00000000000a',
                               'cccccccc-0000-0000-0000-00000000000b',
                               'cccccccc-0000-0000-0000-00000000000c')),
    0::bigint,
    'not even a share left behind under one of its participants');

select is(
    pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000b'),
    (select h from before_porto),
    'Porto, with the same people on it, keeps everything it had');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
      where participant_id in ('dddddddd-0000-0000-0000-00000000000a',
                               'dddddddd-0000-0000-0000-00000000000b')),
    (select nets from before_porto),
    'and its balances');

select is(
    (select count(*) from auth.users where id in ('11111111-1111-1111-1111-111111111111',
                                                  '22222222-2222-2222-2222-222222222222',
                                                  '33333333-3333-3333-3333-333333333333')),
    3::bigint,
    'every account that was on the trip is still there');

-- ------------------------------------------------------------------------------ a closed trip too
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000c')$$,
    'Ana closes Lisboa');

reset role;
select is(
    (select summary is not null from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000c'),
    true,
    'which freezes its summary');

set local role authenticated;
select lives_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000c', 'Lisboa 2026')$$,
    'and a closed trip is deleted as readily as an open one');

select lives_ok(
    $$set constraints all immediate$$,
    'leaving, again, nothing that points at somebody who is gone');

reset role;
select is(
    pg_temp.holdings('aaaaaaaa-0000-0000-0000-00000000000c'),
    array[0, 0, 0, 0, 0, 0, 0]::bigint[],
    'its frozen summary going with the row, and everything else with it');

select throws_ok(
    $$select public.delete_trip('aaaaaaaa-0000-0000-0000-00000000000c', 'Lisboa 2026')$$,
    '42501', null, 'a trip already gone has nobody left on it who could delete it again');

select * from finish();
rollback;
