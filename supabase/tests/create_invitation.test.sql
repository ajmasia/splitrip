-- Minting an invitation: who may, what the token is made of, and what the invitation carries.

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, who organises Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, along for the ride
             ('33333333-3333-3333-3333-333333333333'::uuid)    -- somebody with no trip at all
     ) as u(id);

insert into public.trips (id, name, status, closed_at, summary) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026', 'open', null, null),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026', 'closed', now(), '{}'::jsonb);

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin');

-- ---------------------------------------------------------------------------- the token itself
select is(
    (select count(distinct public.new_invitation_token()) from generate_series(1, 200)),
    200::bigint,
    'two hundred tokens are two hundred different tokens: they are drawn, not counted out');

select is(
    (select count(*) from generate_series(1, 50) g
     where public.new_invitation_token() !~ '^[A-Za-z0-9_-]{22}$'),
    0::bigint,
    'each is 22 URL-safe characters, which is the 128 bits pgcrypto handed over');

-- ------------------------------------------------------------------------- Ana, the organiser
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'an organiser mints an invitation to their trip');

select is(
    (select role from public.invitations where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    'participant',
    'which brings somebody in as a participant unless asked otherwise');

select ok(
    (select revoked_at is null and expires_at > now()
     from public.invitations where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    'and is recorded active: not revoked, not yet expired');

select ok(
    (select expires_at between now() + interval '29 days' and now() + interval '30 days'
     from public.invitations where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    'lasting thirty days by default');

select is(
    (select created_by from public.invitations where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    '11111111-1111-1111-1111-111111111111'::uuid,
    'attributed to whoever minted it');

select matches(
    (select token from public.invitations where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    '^[A-Za-z0-9_-]{22}$',
    'carrying a token the caller had no say in');

select is(
    (select role from public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'admin')),
    'admin',
    'an invitation can hand over the organising as well');

select ok(
    (select expires_at between now() + interval '6 days' and now() + interval '7 days'
     from public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 7)),
    'and can be told how long to last');

select is(
    (select count(distinct token) from public.invitations
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    3::bigint,
    'three invitations, three tokens');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'organiser')$$,
    'SP019', null, 'there is no third role to invite somebody as');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 0)$$,
    'SP020', null, 'an invitation that expires before it is read is not an invitation');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 400)$$,
    'SP020', null, 'and one that outlives the trip by a year is not either');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000b')$$,
    'SP001', null, 'a closed trip takes nobody else in');

select throws_ok(
    $$insert into public.invitations (trip_id, token) values
      ('aaaaaaaa-0000-0000-0000-00000000000a', 'Nq8Kq2mB7vN4pR1sT6wY9a')$$,
    '42501', null,
    'not even an organiser writes an invitation by hand: the token is not theirs to choose');

-- ------------------------------------------------------------------------------ Beto, and then
-- ------------------------------------------------------------------------- somebody passing by
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP018', null, 'a participant cannot invite anybody');

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP018', null, 'and an outsider is refused in the same words, learning nothing of the trip');

reset role;
set local request.jwt.claims = '';

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    '42501', null, 'without a session there is nobody to be an organiser');

select * from finish();
rollback;
