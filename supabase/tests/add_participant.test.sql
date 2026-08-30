-- Adding somebody who is on the trip but not on the application.
--
-- The point of these rows is that they belong to nobody: a NULL `user_id` never matches
-- `auth.uid()`, so the row grants no access to anyone until somebody claims it. What it does grant
-- is a place in the split and a balance of its own, which is what the trip needs it for.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, who organises
             ('22222222-2222-2222-2222-222222222222'::uuid)    -- Beto, who does not
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ------------------------------------------------------------------------------- adding somebody
select lives_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', '  Abuela  ')$$,
    'an organiser adds somebody by name alone');

select is(
    (select array[display_name, role] from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and user_id is null),
    array['Abuela', 'participant'],
    'trimmed, and a traveller unless told otherwise');

select is(
    (select count(*) from public.participants
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and user_id is null),
    1::bigint,
    'holding no session of their own');

select lives_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', 'Nene')$$,
    'and another, because the constraint on one session per trip ignores nulls');

-- ------------------------------------------------------------------------ what the place is for
select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Ice creams',
        p_amount_cents => 900,
        p_paid_by => (select id from public.participants where display_name = 'Abuela'),
        p_split_participant_ids => array[
            (select id from public.participants where display_name = 'Abuela'),
            (select id from public.participants where display_name = 'Nene')])$$,
    'somebody with no session can be named as the payer and be in the split');

select is(
    (select net_cents from public.participant_balances b
     join public.participants p on p.id = b.participant_id
     where p.display_name = 'Abuela'),
    450::bigint,
    'and carries the balance that follows from it');

select is(
    (select sum(net_cents) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    0::numeric,
    'with the trip still adding up to zero');

-- --------------------------------------------------------------------------------- what is refused
select throws_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', 'abuela')$$,
    'SP013', null, 'the same name again is refused, whatever its case and spacing');

select throws_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', '   ')$$,
    'SP012', null, 'and a name of nothing but spaces is no name');

select throws_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000b', 'Anybody')$$,
    '42501', null, 'a trip somebody is not on is not theirs to add to');

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', 'Hodor')$$,
    'SP018', null, 'and a traveller does not add people to a trip somebody else organises');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- Closed the way the application closes it, rather than by hand: the trip carries a summary and a
-- closing time that its own constraints insist on, and inventing them here would test a state the
-- application cannot produce.
select public.close_trip('aaaaaaaa-0000-0000-0000-00000000000a') \g /dev/null

select throws_ok(
    $$select public.add_participant('aaaaaaaa-0000-0000-0000-00000000000a', 'Latecomer')$$,
    'SP001', null, 'nobody joins a trip that is over');

reset role;
select * from finish();
rollback;
