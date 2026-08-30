-- Balances, against figures worked out by hand.
--
-- The trip: Ana, Beto and Carla.
--   * Dinner, 60.00, paid by Ana, split three ways        -> 20.00 charged to each
--   * Taxi, 10.00, paid by Beto, split with Carla only    -> 5.00 charged to each of the two
--   * Van rental, 300.00, a contribution paid by Ana      -> counts as spending, charges nobody
--   * Carla hands Ana 15.00                                -> moves both balances
--   * Beto hands Ana 9.99, voided                          -> moves nothing
--
--   Ana   = 60.00 paid - 20.00 charged - 15.00 collected  = +25.00
--   Beto  = 10.00 paid - 25.00 charged                    = -15.00
--   Carla =  0.00 paid - 25.00 charged + 15.00 handed over = -10.00
--                                                           ---------
--                                                             0.00

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('11111111-1111-1111-1111-111111111111'::uuid),   -- Ana
             ('22222222-2222-2222-2222-222222222222'::uuid),   -- Beto
             ('33333333-3333-3333-3333-333333333333'::uuid),   -- Carla
             ('44444444-4444-4444-4444-444444444444'::uuid),   -- Dani, on another trip
             ('55555555-5555-5555-5555-555555555555'::uuid)    -- nobody, no trips at all
     ) as u(id);

insert into public.trips (id, name) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'Iceland 2026'),
    ('aaaaaaaa-0000-0000-0000-00000000000b', 'Porto 2026');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana', 'admin'),
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Beto', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'Carla', 'participant'),
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000b', '44444444-4444-4444-4444-444444444444', 'Dani', 'admin');

insert into public.expenses (id, trip_id, type, description, amount_cents, paid_by, created_by) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'shared', 'Dinner', 6000,
     'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a'),
    ('eeeeeeee-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', 'shared', 'Taxi', 1000,
     'cccccccc-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b'),
    ('eeeeeeee-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-00000000000a', 'contribution', 'Van rental', 30000,
     'cccccccc-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a');

insert into public.expense_shares (expense_id, participant_id, amount_cents) values
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000c', 2000),
    ('eeeeeeee-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b', 500),
    ('eeeeeeee-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000c', 500);

insert into public.payments (trip_id, from_participant_id, to_participant_id, amount_cents, voided_at, created_by) values
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000c',
     'cccccccc-0000-0000-0000-00000000000a', 1500, null, 'cccccccc-0000-0000-0000-00000000000c'),
    ('aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000b',
     'cccccccc-0000-0000-0000-00000000000a', 999, now(), 'cccccccc-0000-0000-0000-00000000000b');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select net_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000a'),
          2500::bigint, 'Ana fronted the dinner and is owed 25.00');
select is((select net_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000b'),
          -1500::bigint, 'Beto paid the taxi but ate, and owes 15.00');
select is((select net_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000c'),
          -1000::bigint, 'Carla paid nothing and has already handed over 15.00, so she owes 10.00');
select is((select sum(net_cents) from public.participant_balances
           where trip_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          0::numeric, 'the balances of a trip sum to exactly zero');

select is((select paid_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000a'),
          6000::bigint, 'the contribution does not count as money Ana is owed');
select is((select contributed_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000a'),
          30000::bigint, 'it is reported apart, because it is still money the trip cost');
select is((select charged_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000b'),
          2500::bigint, 'Beto is charged his share of the dinner and of his own taxi');
select is((select settlements_received_cents from public.participant_balances where participant_id = 'cccccccc-0000-0000-0000-00000000000a'),
          1500::bigint, 'a voided payment moves nobody');

select is((select count(*) from public.participant_balances), 3::bigint,
          'a participant sees the balances of their trip and of no other');

reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select is((select count(*) from public.participant_balances), 0::bigint,
          'an outsider reads no balance at all: the view carries the policies of its tables');

reset role;
select * from finish();
rollback;
