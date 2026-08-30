-- Withdrawing access: revoking an invitation, and taking somebody off a trip they have money on.

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, who organises
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, who paid for dinner
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, who owes nothing
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- Dani, who settled up
             ('55555555-5555-5555-5555-555555555555'::uuid),   -- Eva, who was in a split
             ('66666666-6666-6666-6666-666666666666'::uuid),   -- somebody with no trip at all
             ('77777777-7777-7777-7777-777777777777'::uuid)    -- Fran, who has touched no money
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000a', '44444444-4444-4444-4444-444444444444', 'Dani', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000e', 'aaaaaaaa-0000-0000-0000-00000000000a', '55555555-5555-5555-5555-555555555555', 'Eva', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-00000000000a', '77777777-7777-7777-7777-777777777777', 'Fran', 'participant');

insert into public.invitations (id, trip_id, token, role, created_by) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Zx8Kq2mB7vN4pR1sT6wY9a', 'participant', '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Ad8Kq2mB7vN4pR1sT6wY9a', 'participant', '11111111-1111-1111-1111-111111111111');

-- Beto paid for a dinner that Beto and Eva shared. Dani settled up with Ana.
insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Dinner', 4000,
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b');

insert into public.expense_shares (expense_id, participant_id, amount_cents) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000e', 2000);

insert into public.payments (trip_id, from_participant_id, to_participant_id, amount_cents, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000d',
     'cccccccc-0000-0000-0000-00000000000a', 1000, 'cccccccc-0000-0000-0000-00000000000a');

-- ------------------------------------------------------------------------- Ana, the organiser
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select isnt(
    (select revoked_at from public.revoke_invitation('bbbbbbbb-0000-0000-0000-000000000001')),
    null, 'an organiser revokes an invitation');

select lives_ok(
    $$select public.revoke_invitation('bbbbbbbb-0000-0000-0000-000000000001')$$,
    'and revoking it twice is not an error: the first one is the one that counts');

select throws_ok(
    $$select public.join_trip('Zx8Kq2mB7vN4pR1sT6wY9a', 'Nuria')$$,
    'SP010', null, 'a revoked invitation lets nobody else in');

select is(
    (select count(*) from public.participants where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    6::bigint,
    'and the people who joined through it are still on the trip');

select throws_ok(
    $$select public.revoke_invitation('bbbbbbbb-0000-0000-0000-00000000000f')$$,
    'SP010', null, 'an invitation that does not exist cannot be revoked');

-- ------------------------------------------------------------------------ taking somebody off
select lives_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000c')$$,
    'somebody who owes and is owed nothing comes off the trip');

select is_empty(
    $$select 1 from public.participants where id = 'cccccccc-0000-0000-0000-00000000000c'$$,
    'and the row is gone, so their credential stops reaching the trip');

select is(
    (select count(*) from public.activity where action = 'participant.left'),
    1::bigint,
    'leaving is written to the activity feed like everything else');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000b')$$,
    'SP021', null, 'whoever paid for something cannot simply be taken off');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000e')$$,
    'SP021', null, 'and neither can somebody who was only in the split');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000d')$$,
    'SP022', null, 'nor somebody who handed money over');

select is(
    (select count(*) from public.participants where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    5::bigint,
    'so a trip with money on it keeps everybody the money touches');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-0000000000ff')$$,
    'SP007', null, 'somebody who is not on the trip cannot be taken off it');

-- ---------------------------------------------------------------------------- Beto, and then
-- ------------------------------------------------------------------- somebody with no trip
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.revoke_invitation('bbbbbbbb-0000-0000-0000-000000000002')$$,
    'SP018', null, 'a participant revokes nothing');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000d')$$,
    'SP018', null, 'and takes nobody off the trip either');

reset role;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.revoke_invitation('bbbbbbbb-0000-0000-0000-000000000002')$$,
    'SP018', null, 'an outsider is refused in the same words, learning nothing');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000d')$$,
    'SP018', null, 'in both directions');

-- ------------------------------------------------------------------------ the chair stays filled
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.set_participant_role('cccccccc-0000-0000-0000-00000000000a', 'participant')$$,
    'SP023', null, 'the only organiser cannot step down and leave nobody in charge');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000a')$$,
    'SP022', null, 'and money refuses before the empty chair does, because that refusal is final');

select is(
    (select role from public.set_participant_role('cccccccc-0000-0000-0000-00000000000f', 'admin')),
    'admin', 'so they hand the keys to somebody else first');

select is(
    (select role from public.set_participant_role('cccccccc-0000-0000-0000-00000000000a', 'participant')),
    'participant', 'and now they can step down');

-- ------------------------------------------------------------------------------ Fran, in charge
reset role;
set local request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
set local role authenticated;

select is(
    (select role from public.set_participant_role('cccccccc-0000-0000-0000-00000000000a', 'participant')),
    'participant', 'asking for the role somebody already holds changes nothing and is not an error');

select throws_ok(
    $$select public.set_participant_role('cccccccc-0000-0000-0000-00000000000f', 'participant')$$,
    'SP023', null, 'the one left in the chair cannot empty it either');

select throws_ok(
    $$select public.remove_participant('cccccccc-0000-0000-0000-00000000000f')$$,
    'SP023', null, 'and owing nothing is no way around it: walking out empties the same chair');

select throws_ok(
    $$select public.set_participant_role('cccccccc-0000-0000-0000-00000000000a', 'organiser')$$,
    'SP019', null, 'there are two roles on a trip and no third one');

select * from finish();
rollback;
