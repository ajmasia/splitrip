-- Read isolation between trips.
--
-- Every case checks both sides of the same policy: that the person who belongs sees their data,
-- and that the person who does not sees nothing at all. A policy that only ever gets tested from
-- the inside is a policy nobody has tested.

begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- The fixture is created by the migration owner, who is not subject to the policies.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,  Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, Porto
             ('44444444-4444-4444-4444-444444444444'::uuid)    -- someone with no trip at all
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000b', '33333333-3333-3333-3333-333333333333', 'Carla', 'admin');

insert into public.invitations (trip_id, token, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Zx8Kq2mB7vN4pR1sT6wY9a', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Bq8Kq2mB7vN4pR1sT6wY9a', '33333333-3333-3333-3333-333333333333');

insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Dinner', 6000,
     'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a'),
    ('eeeeeeee-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Ferry', 4000,
     'cccccccc-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-00000000000c');

insert into public.expense_shares (expense_id, participant_id, amount_cents) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 3000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b', 3000),
    ('eeeeeeee-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000c', 4000);

insert into public.payments (trip_id, from_participant_id, to_participant_id, amount_cents, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b',
     'cccccccc-0000-0000-0000-00000000000a', 3000, 'cccccccc-0000-0000-0000-00000000000b');

-- ---------------------------------------------------------------- Ana, who is on the Iceland trip
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.trips), 1::bigint,
          'a participant sees exactly one trip: the one they are on');
select is((select id from public.trips), 'aaaaaaaa-0000-0000-0000-00000000000a'::uuid,
          'and it is their own trip, not the other one');
select is((select count(*) from public.participants), 2::bigint,
          'they see everyone on their trip, and nobody from the other');
select is((select count(*) from public.invitations), 1::bigint,
          'they see the invitations of their trip only');
select is((select count(*) from public.expenses), 1::bigint,
          'they see the expenses of their trip only');
select is((select count(*) from public.expense_shares), 2::bigint,
          'they see the shares of their own expenses, reached through the expense');
select is((select count(*) from public.payments), 1::bigint,
          'they see the payments of their trip only');
select cmp_ok((select count(*) from public.activity), '>', 0::bigint,
          'they see the activity of their trip');
select is((select count(*) from public.activity
           where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000b'), 0::bigint,
          'and none of the activity of the other trip');

-- -------------------------------------------------------------- Carla, who is on the Porto trip
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is((select count(*) from public.trips), 1::bigint,
          'a participant of the other trip also sees exactly one');
select is((select id from public.trips), 'aaaaaaaa-0000-0000-0000-00000000000b'::uuid,
          'and it is hers, which is the symmetrical half of the same policy');
select is((select description from public.expenses), 'Ferry',
          'she sees her own expense and not the dinner of the first trip');

-- -------------------------------------------------- somebody with a session but no trip at all
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select is((select count(*) from public.trips), 0::bigint, 'an outsider gets no trips');
select is((select count(*) from public.participants), 0::bigint, 'an outsider gets no participants');
select is((select count(*) from public.invitations), 0::bigint,
          'an outsider gets no invitations: not even the existence of a trip leaks');
select is((select count(*) from public.expenses), 0::bigint, 'an outsider gets no expenses');
select is((select count(*) from public.expense_shares), 0::bigint, 'an outsider gets no shares');
select is((select count(*) from public.payments), 0::bigint, 'an outsider gets no payments');
select is((select count(*) from public.activity), 0::bigint, 'an outsider gets no activity');

-- ---------------------------------------------------------------------- nobody, with no session
reset role;
set local request.jwt.claims = '';
set local role anon;

select is((select count(*) from public.trips), 0::bigint, 'with no session at all, nothing is readable');

reset role;
select * from finish();
rollback;
