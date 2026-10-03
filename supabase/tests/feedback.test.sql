-- Sending feedback, its limits, the context kept with it, and that only operators read it.
--
-- Beto organises Iceland, and Carla joined it from her phone. Ana runs the instance and is on no
-- trip. Dani has a device identity and no trip of these.

begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into public.instance_operators (email) values ('ana@splitrip.test');

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', anon, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid, false),   -- Ana,   operator
             ('22222222-2222-2222-2222-222222222222'::uuid, false),   -- Beto,  organiser
             ('33333333-3333-3333-3333-333333333333'::uuid, true),    -- Carla, participant
             ('44444444-4444-4444-4444-444444444444'::uuid, true)     -- Dani,  on no trip
     ) as u(id, anon);

insert into public.trips (id, name) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026');

insert into public.participants (trip_id, user_id, display_name, role) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'admin'),
    ('aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant');

create function pg_temp.sent_by(p_user_id uuid)
returns bigint
language sql
as $$ select count(*) from public.feedback where user_id = p_user_id $$;

-- ------------------------------------------------------------------------------------ sending
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select lives_ok(
    $$select public.submit_feedback('  The balance looks off  ', 'idea', '/trips/aaaaaaaa-0000-0000-0000-00000000000a/balances',
                                    'aaaaaaaa-0000-0000-0000-00000000000a', '0.12.0', 'en')$$,
    'a device identity sends feedback from one of its trip''s screens');

select lives_ok(
    $$select public.submit_feedback('Something else entirely')$$,
    'and sends it with nothing but a message');

select is_empty(
    $$select 1 from public.feedback$$,
    'but reads none of it back afterwards');

select throws_ok(
    $$select public.submit_feedback('')$$,
    'SP031', null, 'an empty message is refused');

select throws_ok(
    $$select public.submit_feedback(E'  \n\t ')$$,
    'SP031', null, 'and so is one of nothing but whitespace');

select throws_ok(
    $$select public.submit_feedback(repeat('a', 2001))$$,
    'SP032', null, 'and one over 2,000 characters, whatever the form allowed');

select throws_ok(
    $$insert into public.feedback (user_id, message) values (auth.uid(), 'Around the function')$$,
    '42501', null, 'there is no way in but the function');

reset role;

select is(
    (select array[kind, message, path, app_version, locale, trip_id::text] from public.feedback
     where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'idea'),
    array['idea', 'The balance looks off', '/trips/aaaaaaaa-0000-0000-0000-00000000000a/balances',
          '0.12.0', 'en', 'aaaaaaaa-0000-0000-0000-00000000000a'],
    'it is kept trimmed, with its kind, its screen, the version, the language and the trip');

select is(
    (select kind from public.feedback where message = 'Something else entirely'),
    'other',
    'with no kind chosen it is "something else"');

select is(
    pg_temp.sent_by('33333333-3333-3333-3333-333333333333'),
    2::bigint,
    'and the refused submissions kept nothing');

-- ------------------------------------------------------------------------------ the hour limit
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select public.submit_feedback('Third') \g /dev/null
select public.submit_feedback('Fourth') \g /dev/null

select lives_ok(
    $$select public.submit_feedback('Fifth')$$,
    'the fifth message within an hour is accepted');

select throws_ok(
    $$select public.submit_feedback('Sixth')$$,
    'SP033', null, 'the sixth is refused');

reset role;

select is(
    pg_temp.sent_by('33333333-3333-3333-3333-333333333333'),
    5::bigint,
    'and is not kept');

update public.feedback set created_at = now() - interval '61 minutes'
where user_id = '33333333-3333-3333-3333-333333333333' and message = 'Third';

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select lives_ok(
    $$select public.submit_feedback('Once the hour has passed')$$,
    'a message older than an hour no longer counts');

-- ------------------------------------------------------------------- what is kept as context
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select lives_ok(
    $$select public.submit_feedback('Naming a trip I am not in', 'bug', '/', 'aaaaaaaa-0000-0000-0000-00000000000a')$$,
    'naming a trip the sender is not in is not refused');

select public.submit_feedback('From elsewhere', 'other', '//evil.example/path') \g /dev/null
select public.submit_feedback('From elsewhere too', 'other', '/\evil.example') \g /dev/null
select public.submit_feedback('From a full address', 'other', 'https://evil.example/') \g /dev/null

reset role;

select is(
    (select trip_id from public.feedback where message = 'Naming a trip I am not in'),
    null::uuid,
    'but the trip is not kept');

select is(
    (select array_agg(path order by message) from public.feedback
     where user_id = '44444444-4444-4444-4444-444444444444' and message like 'From%'),
    array[null, null, null]::text[],
    'and a screen that is not one of the application''s is not kept either');

-- -------------------------------------------------------------------------------------- reading
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"beto@splitrip.test"}';
set local role authenticated;

select lives_ok(
    $$select public.submit_feedback(repeat('b', 2000), 'bug', '/trips/aaaaaaaa-0000-0000-0000-00000000000a',
                                    'aaaaaaaa-0000-0000-0000-00000000000a', '0.12.0', 'es')$$,
    'a message of exactly 2,000 characters is accepted');

select is_empty(
    $$select 1 from public.feedback$$,
    'a trip''s organiser reads no feedback, not even what was sent from their trip');

select is_empty(
    $$select 1 from public.operator_feedback()$$,
    'not through the operators'' list either');

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select is_empty(
    $$select 1 from public.feedback$$,
    'nor does a participant');

reset role;

-- Everything here was sent within one transaction, at one instant; the last message is moved on a
-- little so that the order has something to show.
update public.feedback set created_at = now() + interval '1 minute' where message = repeat('b', 2000);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"ana@splitrip.test"}';
set local role authenticated;

select is(
    (select count(*) from public.feedback),
    11::bigint,
    'an operator reads every message, whoever sent it');

select is_empty(
    $$select 1 from public.trips$$,
    'and is still nobody on a trip they do not take part in');

select is(
    (select array[kind, trip_name] from public.operator_feedback() where message = 'The balance looks off'),
    array['idea', 'Iceland 2026'],
    'but the list names the trip a message was sent from');

select is(
    (select message from public.operator_feedback() limit 1),
    repeat('b', 2000),
    'newest first');

select is_empty(
    $$update public.feedback set message = 'Rewritten' returning 1$$,
    'reading is all an operator does: they change nothing');

select is_empty(
    $$delete from public.feedback returning 1$$,
    'and deletes nothing');

reset role;
set local request.jwt.claims = '{}';
set local role anon;

select throws_ok(
    $$select public.submit_feedback('Without a session')$$,
    '42501', null, 'sending needs a session, if only a device''s');

-- --------------------------------------------------------------------- when the trip is gone
reset role;
delete from public.trips where id = 'aaaaaaaa-0000-0000-0000-00000000000a';

select is(
    (select count(*) from public.feedback where trip_id is null and path like '/trips/%'),
    2::bigint,
    'deleting a trip keeps what was sent from it, without the trip');

select * from finish();
rollback;
