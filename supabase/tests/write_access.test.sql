-- Who may change what.
--
-- Denied writes are silent by design: an UPDATE or DELETE that no policy allows simply touches no
-- row, it does not raise. So every negative case here reads the value back and asserts it did not
-- move. Only a denied INSERT raises, and those are checked by error code.

begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,  admin of Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, participant of Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, admin of Porto
             ('55555555-5555-5555-5555-555555555555'::uuid)    -- Dani, on Iceland but owing nothing
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000a', '55555555-5555-5555-5555-555555555555', 'Dani', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000b', '33333333-3333-3333-3333-333333333333', 'Carla', 'admin');

insert into public.invitations (id, trip_id, token, created_by) values
    ('bbbbbbbb-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'Zx8Kq2mB7vN4pR1sT6wY9a', '11111111-1111-1111-1111-111111111111');

insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Dinner', 6000,
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b'),   -- Beto's
    ('eeeeeeee-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Museum', 2000,
     'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a');   -- Ana's

insert into public.payments (id, trip_id, from_participant_id, to_participant_id, amount_cents, created_by) values
    ('ffffffff-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000a', 3000,
     'cccccccc-0000-0000-0000-00000000000b');

-- ------------------------------------------------------------- Beto, a participant of the trip
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

update public.expenses set description = 'Beto was here' where id = 'eeeeeeee-0000-0000-0000-00000000000b';
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000b'),
          'Museum', 'a participant cannot edit an expense recorded by someone else');

update public.expenses set description = 'Dinner in Reykjavik' where id = 'eeeeeeee-0000-0000-0000-00000000000a';
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000a'),
          'Dinner', 'not even its own author edits an expense by hand: its shares would be left stale');

delete from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000b';
select isnt_empty($$select 1 from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000b'$$,
          'a participant cannot delete an expense recorded by someone else');

update public.trips set name = 'Beto''s trip' where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is((select name from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'Iceland 2026', 'a participant cannot rename the trip');

update public.participants set role = 'admin' where id = 'cccccccc-0000-0000-0000-00000000000b';
select is((select role from public.participants where id = 'cccccccc-0000-0000-0000-00000000000b'),
          'participant', 'a participant cannot promote themselves');

delete from public.participants where id = 'cccccccc-0000-0000-0000-00000000000d';
select isnt_empty($$select 1 from public.participants where id = 'cccccccc-0000-0000-0000-00000000000d'$$,
          'a participant cannot remove anybody from the trip');

select throws_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'SP018', null, 'a participant cannot generate an invitation');

select throws_ok(
    $$insert into public.expenses (trip_id, description, amount_cents, paid_by, created_by) values
      ('aaaaaaaa-0000-0000-0000-00000000000a', 'By hand', 100,
       'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b')$$,
    '42501', null, 'nobody records an expense by hand: it is created with its shares or not at all');

select throws_ok(
    $$insert into public.expense_shares (expense_id, participant_id, amount_cents) values
      ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000d', 1)$$,
    '42501', null, 'nor can a share be attached by hand');

select throws_ok(
    $$insert into public.activity (trip_id, action) values
      ('aaaaaaaa-0000-0000-0000-00000000000a', 'expense.created')$$,
    '42501', null, 'the activity feed cannot be written by a client: only the triggers write it');

update public.payments set voided_at = now() where id = 'ffffffff-0000-0000-0000-00000000000a';
select is((select voided_at from public.payments where id = 'ffffffff-0000-0000-0000-00000000000a'),
          null, 'a payment is not voided by hand: the same door would let its amount be rewritten');

-- ------------------------------------------------------------------- Ana, the trip organiser
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

update public.expenses set description = 'Dinner, corrected' where id = 'eeeeeeee-0000-0000-0000-00000000000a';
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000a'),
          'Dinner', 'and neither does an admin: corrections go through update_expense');

update public.trips set name = 'Iceland 2027' where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is((select name from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'Iceland 2027', 'an admin renames the trip');

select lives_ok(
    $$select public.create_invitation('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'an admin generates an invitation');

select isnt(
    (select revoked_at from public.revoke_invitation('bbbbbbbb-0000-0000-0000-00000000000a')),
    null, 'an admin revokes an invitation');

update public.participants set role = 'admin' where id = 'cccccccc-0000-0000-0000-00000000000b';
select is((select role from public.participants where id = 'cccccccc-0000-0000-0000-00000000000b'),
          'admin', 'an admin promotes a participant');

delete from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000a';
select isnt_empty($$select 1 from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000a'$$,
          'nor is one deleted by hand, so that a refusal is reported rather than passing in silence');

select public.remove_participant('cccccccc-0000-0000-0000-00000000000d');
select is_empty($$select 1 from public.participants where id = 'cccccccc-0000-0000-0000-00000000000d'$$,
          'an admin removes a participant who owes and is owed nothing');

-- --------------------------------------------------------------------- once the trip is closed
reset role;
update public.trips set status = 'closed', closed_at = now(), summary = '{}'::jsonb
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

update public.expenses set description = 'Too late' where id = 'eeeeeeee-0000-0000-0000-00000000000b';
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000b'),
          'Museum', 'not even an admin edits an expense once the trip is closed');

update public.trips set status = 'open', closed_at = null, summary = null
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is((select status from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'closed', 'a closed trip is not reopened by hand either');

select lives_ok(
    $$select public.reopen_trip('aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'reopening is the one change a closed trip accepts, and it goes through its own function');

-- ------------------------------------------------------- Carla, an admin, but of another trip
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

update public.expenses set description = 'Not mine' where id = 'eeeeeeee-0000-0000-0000-00000000000b';
update public.trips set name = 'Not my trip' where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
reset role;
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-00000000000b'),
          'Museum', 'being an admin of one trip grants nothing on another');
select is((select name from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'Iceland 2027', 'and neither does it allow renaming somebody else''s trip');

select * from finish();
rollback;
