-- An invitation that names the place it opens.
--
-- The general link asks its holder to type a name, which is where a grandmother becomes a second
-- Abuela. When the organiser knows who they are inviting, the link can carry that instead, and
-- there is nothing left to get wrong on arrival.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, is_anonymous, email, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', false, 'ana@splitrip.test', now(), now());

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, a traveller
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- the grandmother, at last
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- somebody else with the link
             ('55555555-5555-5555-5555-555555555555'::uuid)    -- and somebody with no trip at all
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', null, 'Abuela', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---------------------------------------------------------------------------- minting the link
select is(
    (select participant_id from public.create_invitation(
        'aaaaaaaa-0000-0000-0000-00000000000a', 'admin', 30,
        'cccccccc-0000-0000-0000-00000000000c')),
    'cccccccc-0000-0000-0000-00000000000c'::uuid,
    'an invitation can name the place it opens');

select is(
    (select role from public.invitations
     where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
    'participant',
    'and takes its role from that place, not from the role asked for');

select is(
    (select count(*) from public.invitations
     where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
    1::bigint,
    'asking twice hands back the live one rather than piling links on a seat');

select is(
    (select id from public.create_invitation(
        'aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 30,
        'cccccccc-0000-0000-0000-00000000000c')),
    (select id from public.invitations
     where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
    'the same one, by its identifier');

select throws_ok(
    format($$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 30, %L)$$,
           'cccccccc-0000-0000-0000-00000000000d'),
    'SP007', null, 'and it cannot name somebody from another trip');

-- ----------------------------------------------------------- what the screen may say beforehand
select is(
    (select array[display_name, in_use::text] from public.invitation_place(
        (select token from public.invitations
         where participant_id = 'cccccccc-0000-0000-0000-00000000000c'))),
    array['Abuela', 'false'],
    'the join screen may read whose place a link opens, and that nobody is on it');

-- The token is read here, while somebody who may read it is asking. Row Level Security keeps an
-- invitation inside its trip, so the person about to use it cannot look it up — which is the whole
-- reason join_trip exists as a function rather than as a policy.
create temp table link as
select token from public.invitations where participant_id = 'cccccccc-0000-0000-0000-00000000000c';

-- ----------------------------------------------------------------------- coming in through it
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
    (select id from public.join_trip((select token from link))),
    'cccccccc-0000-0000-0000-00000000000c'::uuid,
    'and coming in through it needs no name at all');

select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    3::bigint,
    'without creating anybody');

select ok(
    public.is_trip_member('aaaaaaaa-0000-0000-0000-00000000000a'),
    'she is in the trip now');

reset role;
select is(
    (select in_use from public.invitation_place((select token from link))),
    true,
    'and afterwards it says the place has somebody on it, which is a question, not a refusal');

-- --------------------------------------------------------- and the link is not a way past her
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    format($$select public.join_trip(%L)$$, (select token from link)),
    'SP027', null, 'somebody else holding it is refused rather than offered her seat');

-- Which is a question, not a wall. Losing a phone is what an organiser mints one of these for, and
-- the answer is the same as everywhere else here: the place is taken by saying so.
select is(
    (select id from public.join_trip((select token from link), null, true)),
    'cccccccc-0000-0000-0000-00000000000c'::uuid,
    'and confirming takes the place, which is how a lost phone is replaced');

reset role;

select is(
    (select user_id from public.participants
     where id = 'cccccccc-0000-0000-0000-00000000000c'),
    '44444444-4444-4444-4444-444444444444'::uuid,
    'the place answering from the new device, and from no other');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    format($$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a', 'participant', 30, %L)$$,
           'cccccccc-0000-0000-0000-00000000000c'),
    'SP018', null, 'and a traveller mints nobody a link');

-- ------------------------------------------------- a place that belongs to an account, never
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

create temp table anas_link as
select token from public.create_invitation(
    'aaaaaaaa-0000-0000-0000-00000000000a', null, 30, 'cccccccc-0000-0000-0000-00000000000a');

reset role;
select is(
    (select takeable from public.invitation_place((select token from anas_link))),
    false,
    'a place held by an account is not offered to be taken: its holder signs in instead');

-- Somebody who is on no trip, so the refusal is the refusal and not "you are already in".
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    format($$select public.join_trip(%L, null, true)$$, (select token from anas_link)),
    'SP029', null,
    'and insisting is refused — a link must never be able to lock somebody out of their own trip');

reset role;
select * from finish();
rollback;
