-- Who is an operator of the instance, and that the list itself is nobody's to read.

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into public.instance_operators (email) values ('ana@splitrip.test'), ('later@splitrip.test');

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana, an operator
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto, who is not
             ('33333333-3333-3333-3333-333333333333'::uuid)    -- signs up after being listed
     ) as u(id);

select is(
    (select public.is_operator()),
    false,
    'nobody is an operator without a session');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"ana@splitrip.test"}';
set local role authenticated;

select is(
    (select public.is_operator()),
    true,
    'a signed-in account whose address is on the list is an operator');

select is_empty(
    $$select 1 from public.instance_operators$$,
    'and even an operator reads nothing of the list');

select throws_ok(
    $$insert into public.instance_operators (email) values ('friend@splitrip.test')$$,
    '42501', null, 'nor adds anybody to it');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"  ANA@Splitrip.test  "}';
set local role authenticated;

select is(
    (select public.is_operator()),
    true,
    'an address on the list is recognised whatever its case and spacing');

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"later@splitrip.test"}';
set local role authenticated;

select is(
    (select public.is_operator()),
    true,
    'an address listed before its account existed is recognised once it signs in');

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"beto@splitrip.test"}';
set local role authenticated;

select is(
    (select public.is_operator()),
    false,
    'an account not on the list is not an operator');

select is_empty(
    $$select 1 from public.instance_operators$$,
    'and reads nothing of the list either');

select throws_ok(
    $$insert into public.instance_operators (email) values ('beto@splitrip.test')$$,
    '42501', null, 'nor puts itself on it');

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true,"email":"ana@splitrip.test"}';
set local role authenticated;

select is(
    (select public.is_operator()),
    false,
    'a device identity is never an operator, whatever else it carries');

select * from finish();
rollback;
