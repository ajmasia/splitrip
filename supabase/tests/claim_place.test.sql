-- Somebody the organiser added by name, later picking up the application.
--
-- The place already has a history: a share of an expense, a role, a name. Claiming it must attach a
-- session to that participant rather than create a second one, or the trip would end up with two
-- Abuelas and a balance split between them.

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, who organises
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, already on his phone
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- the grandmother, at last
             ('44444444-4444-4444-4444-444444444444'::uuid)    -- somebody else entirely
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    -- Added by name alone, and already part of the accounts.
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', null, 'Abuela', 'participant');

insert into public.expenses (id, trip_id, type, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'shared', 'Dinner', 6000,
     'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a');

insert into public.expense_shares (expense_id, participant_id, amount_cents) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000c', 2000);

-- Carrying `admin`, to prove the role on the row is the one that survives.
insert into public.invitations (id, trip_id, token, role, created_by) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Ad8Kq2mB7vN4pR1sT6wY9a', 'admin', '11111111-1111-1111-1111-111111111111');

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

-- ------------------------------------------------------------ the two refusals, told apart
select throws_ok(
    $$select public.join_trip('Ad8Kq2mB7vN4pR1sT6wY9a', '  abuela  ')$$,
    'SP026', null, 'an unclaimed place says so, whatever the case and spacing of the name');

select throws_ok(
    $$select public.join_trip('Ad8Kq2mB7vN4pR1sT6wY9a', 'Beto')$$,
    'SP013', null, 'and a name a device is answering to is the other refusal entirely');

-- ------------------------------------------------------------------------- claiming the place
select is(
    (select id from public.join_trip('Ad8Kq2mB7vN4pR1sT6wY9a', 'Abuela', true)),
    'cccccccc-0000-0000-0000-00000000000c'::uuid,
    'confirming binds the session to the participant that was already there');

select is(
    (select user_id from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c'),
    '33333333-3333-3333-3333-333333333333'::uuid,
    'which is what the session on the row now says');

select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    3::bigint,
    'and no second Abuela was created alongside her');

select is(
    (select role from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c'),
    'participant',
    'the role on the row wins over the one the invitation carried');

select is(
    (select charged_cents from public.participant_balances
     where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
    2000::bigint,
    'her share of the dinner is still hers');

select is(
    (select net_cents from public.participant_balances
     where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
    -2000::bigint,
    'and so is the balance that follows from it');

select ok(
    public.is_trip_member('aaaaaaaa-0000-0000-0000-00000000000a'),
    'she can read the trip now, which is the whole point of claiming it');

-- ------------------------------------------------------------------ and it cannot happen twice
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.join_trip('Ad8Kq2mB7vN4pR1sT6wY9a', 'Abuela')$$,
    'SP013', null, 'the place now has a device on it, and reads as taken to the next person');

-- Read from outside any session: a stranger cannot see the row they were refused, which is Row
-- Level Security doing its job and not what this assertion is about.
reset role;

select is(
    (select user_id from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c'),
    '33333333-3333-3333-3333-333333333333'::uuid,
    'who is refused without disturbing whoever claimed it');
select * from finish();
rollback;
