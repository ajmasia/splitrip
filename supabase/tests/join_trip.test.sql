-- Joining a trip by invitation: the four ways an invitation can be refused, the name that is
-- already taken, and the same traveller arriving from a second phone.

begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, who organises Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, on his first phone
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- Beto again, on a second phone
             ('55555555-5555-5555-5555-555555555555'::uuid),   -- Eva, invited as an organiser
             ('66666666-6666-6666-6666-666666666666'::uuid)    -- somebody trying their luck
     ) as u(id);

insert into public.trips (id, name, status, closed_at, summary) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026', 'open', null, null),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026', 'closed', now(), '{}'::jsonb);

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin');

insert into public.invitations (id, trip_id, token, role, expires_at, revoked_at, created_by) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Zx8Kq2mB7vN4pR1sT6wY9a', 'participant', now() + interval '30 days', null,
     '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Ad8Kq2mB7vN4pR1sT6wY9a', 'admin', now() + interval '30 days', null,
     '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Rv8Kq2mB7vN4pR1sT6wY9a', 'participant', now() + interval '30 days', now(),
     '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Ex8Kq2mB7vN4pR1sT6wY9a', 'participant', now() - interval '1 day', null,
     '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-00000000000b',
     'Cl8Kq2mB7vN4pR1sT6wY9a', 'participant', now() + interval '30 days', null,
     '11111111-1111-1111-1111-111111111111');

-- ------------------------------------------------------------------------------- Beto walks in
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Beto')$$,
    'somebody opening an active invitation joins by typing only a name');

select is(
    (select role from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and display_name = 'Beto'),
    'participant',
    'with the role the invitation carried');

select isnt_empty(
    $$select 1 from public.activity a
      join public.participants p on p.id = a.subject_id
      where a.action = 'participant.joined' and p.display_name = 'Beto'$$,
    'and the trip records that they joined');

select lives_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Beto with a hat')$$,
    'reopening the invitation from the same device is how somebody returns to the trip');

select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    2::bigint,
    'so it creates no second participant');

select is(
    (select display_name from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
       and user_id = '22222222-2222-2222-2222-222222222222'),
    'Beto',
    'and does not rename them either');

-- --------------------------------------------------------------------- Carla, and a name clash
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', '  beto ')$$,
    'SP013', null,
    'a name already on the trip is refused, whatever its case and spacing');

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', '')$$,
    'SP012', null, 'and joining with no name at all is refused');

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', '   ')$$,
    'SP012', null, 'a name of nothing but spaces being no name');

select lives_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Carla')$$,
    'under a free name she is in');

-- ------------------------------------------------------------------ the invitations that refuse
reset role;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.join_trip('Rv8Kq2mB7vN4pR1sT6wY9a', 'Nobody')$$,
    'SP010', null, 'a revoked invitation lets nobody else in');

select throws_ok(
    $$select public.join_trip('nO7such7token7at7all7x', 'Nobody')$$,
    'SP010', null, 'and neither does a token matching no invitation');

select throws_ok(
    $$select public.join_trip('Ex8Kq2mB7vN4pR1sT6wY9a', 'Nobody')$$,
    'SP011', null, 'an expired invitation says so');

select throws_ok(
    $$select public.join_trip('Cl8Kq2mB7vN4pR1sT6wY9a', 'Nobody')$$,
    'SP001', null, 'and a trip already closed takes no more travellers');

-- Read outside the role: the session that made those attempts is on no trip, so under Row Level
-- Security it would see an empty table and the count would prove nothing.
reset role;
select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    3::bigint,
    'so none of those four attempts put anybody on the trip');

-- ------------------------------------------------------------------ Eva, invited as an organiser
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.join_trip('Ad8Kq2mB7vN4pR1sT6wY9a', 'Eva')$$,
    'an invitation carrying the admin role brings in an organiser');

select is(
    (select role from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and display_name = 'Eva'),
    'admin',
    'with every organiser permission from the start');

-- ------------------------------------------------------------------- Beto, from a second phone
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Beto', p_continue_as_existing => true)$$,
    'on confirming that the name is theirs, they continue as the participant they already were');

select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    4::bigint,
    'rather than turning up twice');

select ok(
    public.is_trip_member('aaaaaaaa-0000-0000-0000-00000000000a'),
    'the new phone reaches the trip');

-- ---------------------------------------------------------- revoking leaves the joined untouched
reset role;
update public.invitations set revoked_at = now()
where id = 'bbbbbbbb-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select ok(
    public.is_trip_member('aaaaaaaa-0000-0000-0000-00000000000a'),
    'revoking an invitation does not turn out the people who came in through it');

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Late arrival')$$,
    'SP010', null, 'though nobody else arrives through it again');

select * from finish();
rollback;
