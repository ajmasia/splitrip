-- Editing an expense and deleting it: who may, and what the balances look like afterwards.
--
-- Beto fronts a 60.00 dinner for the four of them, and it then gets corrected in every way an
-- expense can be corrected — the amount, who it is split among, its type — with the balances
-- checked after each one.

begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana,   admin of Iceland
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto,  Iceland
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla, Iceland
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- Dani,  Iceland
             ('55555555-5555-5555-5555-555555555555'::uuid)    -- Elena, admin of Porto
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana',   'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto',  'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000a', '44444444-4444-4444-4444-444444444444', 'Dani',  'participant'),
    ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000b', '55555555-5555-5555-5555-555555555555', 'Elena', 'admin');

-- ------------------------------------------------------------------------- Beto, who fronted it
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Dinner',
        p_amount_cents => 6000)$$,
    'Beto fronts a 60.00 dinner for the four of them');

create temporary table dinner as select id from public.expenses where description = 'Dinner';

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[-1500, 4500, -1500, -1500]::bigint[],
    'which leaves him 45.00 up and the other three 15.00 down each');

select lives_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_amount_cents => 6500)$$,
    'he corrects the amount to 65.00');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[-1625, 4875, -1625, -1625]::bigint[],
    'and the shares are computed again, so the balances follow the new amount');

select lives_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000b',
                                         'cccccccc-0000-0000-0000-00000000000c']::uuid[])$$,
    'it turns out only he and Carla were there');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[0, 3250, -3250, 0]::bigint[],
    'so the two who were not there owe nothing on it any more');

select is(
    (select count(*) from public.expense_shares where expense_id = (select id from dinner)),
    2::bigint,
    'and the expense carries two shares, not four');

-- ---------------------------------------------------------------------- Carla, who did not pay
reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_description => 'Carla was here')$$,
    '42501', null, 'a participant cannot edit an expense somebody else recorded');

select throws_ok(
    $$select public.delete_expense((select id from dinner))$$,
    '42501', null, 'nor delete it');

select lives_ok(
    $$select public.create_expense(
        p_trip_id => 'aaaaaaaa-0000-0000-0000-00000000000a',
        p_description => 'Postcards',
        p_amount_cents => 400)$$,
    'she records one of her own');

create temporary table postcards as select id from public.expenses where description = 'Postcards';

-- ----------------------------------------------------------------------------- Ana, the organiser
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_description => 'Dinner in Reykjavik')$$,
    'an admin corrects an expense recorded by somebody else');

select is(
    (select description from public.expenses where id = (select id from dinner)),
    'Dinner in Reykjavik',
    'and the correction sticks');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[-100, 3150, -2950, -100]::bigint[],
    'renaming an expense moves no money; only Carla''s postcards did');

select lives_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_type => 'contribution')$$,
    'the dinner turns out to have been Beto''s treat');

select is_empty(
    $$select 1 from public.expense_shares where expense_id = (select id from dinner)$$,
    'so its shares are gone');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[-100, -100, 300, -100]::bigint[],
    'and it puts nobody in debt, its payer included');

select lives_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_type => 'shared')$$,
    'and back to shared again');

select is(
    (select array_agg(net_cents order by participant_id) from public.participant_balances
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
    array[-1725, 4775, -1325, -1725]::bigint[],
    'a contribution that becomes shared again is split among the whole trip');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'expense.updated'),
    5::bigint,
    'every correction leaves its entry in the activity feed');

-- --------------------------------------------------------------------------- what it must refuse
select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_type => 'contribution',
        p_split_participant_ids => array['cccccccc-0000-0000-0000-00000000000b']::uuid[])$$,
    'SP004', null, 'a contribution cannot be given a split');

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_amount_cents => 0)$$,
    'SP002', null, 'an expense cannot be corrected down to nothing');

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_split_participant_ids => array['dddddddd-0000-0000-0000-000000000001']::uuid[])$$,
    'SP006', null, 'the split cannot be moved to somebody outside the trip');

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_split_participant_ids => array[]::uuid[])$$,
    'SP005', null, 'nor emptied');

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_currency => 'USD')$$,
    'SP003', null, 'and it stays in euros');

select lives_ok(
    $$select public.delete_expense((select id from postcards))$$,
    'an admin deletes an expense recorded by somebody else');

-- --------------------------------------------------------------------------- Elena, another trip
reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.update_expense(
        p_expense_id => (select id from dinner),
        p_description => 'Not my trip')$$,
    '42501', null, 'being an admin of another trip grants nothing here');

-- ------------------------------------------------------------------------ Beto deletes his own
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
    $$select public.delete_expense((select id from dinner))$$,
    'the author deletes the expense they recorded');

select is_empty(
    $$select 1 from public.expense_shares where expense_id = (select id from dinner)$$,
    'and its shares go with it');

select is(
    (select count(*) from public.activity
     where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and action = 'expense.deleted'),
    2::bigint,
    'both deletions are traced in the activity feed');

-- ---------------------------------------------------------------------- once the trip is closed
reset role;
insert into public.expenses (id, trip_id, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Ferry', 1000,
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b');
update public.trips set status = 'closed', closed_at = now()
where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select throws_ok(
    $$select public.update_expense(
        p_expense_id => 'eeeeeeee-0000-0000-0000-00000000000f',
        p_amount_cents => 2000)$$,
    'SP001', null, 'a closed trip accepts no correction');

select throws_ok(
    $$select public.delete_expense('eeeeeeee-0000-0000-0000-00000000000f')$$,
    'SP001', null, 'and no deletion');

select * from finish();
rollback;
