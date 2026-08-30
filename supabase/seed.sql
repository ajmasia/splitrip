-- A trip to play with. Loaded into a fresh database by `npm run db:reset`.
--
-- Five friends in Alsace over four days of Christmas markets, organised by Sonia. The numbers are
-- chosen to exercise the awkward cases rather than the easy ones: an 800 EUR flat that Francisca
-- pays for on her own and asks nobody to share, everything else fronted by the other four, expenses
-- split among only some of the group, amounts that do not divide exactly and leave cents over, and
-- two settlement payments already made.
--
-- The shares are computed here with the same rule the application applies: integer division of the
-- cents, with the leftover going one by one to the first participants ordered by their identifier.
-- That is what keeps the shares of an expense adding up to the expense, to the cent.

-- One anonymous identity per person, as if each had joined from her own phone.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('a0000000-0000-0000-0000-000000000001'::uuid),
             ('a0000000-0000-0000-0000-000000000002'::uuid),
             ('a0000000-0000-0000-0000-000000000003'::uuid),
             ('a0000000-0000-0000-0000-000000000004'::uuid),
             ('a0000000-0000-0000-0000-000000000005'::uuid)) as u(id);

insert into public.trips (id, name, start_date, end_date, created_by) values
    ('aa15ac1a-0000-0000-0000-000000000001', 'Viaje a la Alsacia', '2026-12-18', '2026-12-22',
     'a0000000-0000-0000-0000-000000000005');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('c0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Francisca', 'participant'),
    ('c0000000-0000-0000-0000-000000000002', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Yvonne',    'participant'),
    ('c0000000-0000-0000-0000-000000000003', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Virginia',  'participant'),
    ('c0000000-0000-0000-0000-000000000004', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Marta',     'participant'),
    ('c0000000-0000-0000-0000-000000000005', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Sonia',     'admin');

insert into public.invitations (id, trip_id, token, role, created_by) values
    ('b0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001',
     'aLs4ci4Xm2Qv7Bn9Tk3Rd6', 'participant', 'a0000000-0000-0000-0000-000000000005');

insert into public.expenses (id, trip_id, type, description, amount_cents, spent_on, paid_by, created_by) values
    ('e0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001', 'contribution', 'Alojamiento en Colmar, invita Francisca', 80000, '2026-12-18', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000002', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Alquiler del coche',          21000, '2026-12-18', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000003', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Peajes y gasolina',           11570, '2026-12-18', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
    ('e0000000-0000-0000-0000-000000000004', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Compra en el supermercado',    8733, '2026-12-18', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
    ('e0000000-0000-0000-0000-000000000005', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Cena en Estrasburgo',         13240, '2026-12-19', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
    ('e0000000-0000-0000-0000-000000000006', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Vino caliente en el mercado',  2650, '2026-12-19', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
    ('e0000000-0000-0000-0000-000000000007', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Museo Unterlinden',            3900, '2026-12-19', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000008', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Comida en Riquewihr',          7600, '2026-12-20', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000009', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Taxi de vuelta',               2200, '2026-12-20', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
    ('e0000000-0000-0000-0000-00000000000a', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Tren a Estrasburgo',           5500, '2026-12-21', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
    -- Francisca also fronts an ordinary expense, so she appears both ways: 43.72 among five does
    -- not divide, and the two cents over go to the first two participants by identifier.
    ('e0000000-0000-0000-0000-00000000000d', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Desayunos en la panaderia',    4372, '2026-12-20', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
    -- Nobody is expected to pay these two back: they add to what the trip cost and to nobody's debt.
    ('e0000000-0000-0000-0000-00000000000b', 'aa15ac1a-0000-0000-0000-000000000001', 'contribution', 'Cena de despedida, invita Sonia',   9500, '2026-12-21', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005');

-- Who each expense is split among: everyone, unless it is one of the three that only some of them
-- were there for.
with splits as (
    select e.id as expense_id, p.id as participant_id
    from public.expenses e
    join public.participants p on p.trip_id = e.trip_id
    where e.type = 'shared'
      and e.id not in ('e0000000-0000-0000-0000-000000000007',
                       'e0000000-0000-0000-0000-000000000008',
                       'e0000000-0000-0000-0000-000000000009')
    union all
    select * from (values
        -- Sonia skipped the museum
        ('e0000000-0000-0000-0000-000000000007'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000002'),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000003'),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000004'),
        -- only three of them stopped for lunch in Riquewihr: 76.00 among 3 leaves a cent over
        ('e0000000-0000-0000-0000-000000000008',       'c0000000-0000-0000-0000-000000000001'),
        ('e0000000-0000-0000-0000-000000000008',       'c0000000-0000-0000-0000-000000000002'),
        ('e0000000-0000-0000-0000-000000000008',       'c0000000-0000-0000-0000-000000000003'),
        -- and three others shared the taxi back
        ('e0000000-0000-0000-0000-000000000009',       'c0000000-0000-0000-0000-000000000003'),
        ('e0000000-0000-0000-0000-000000000009',       'c0000000-0000-0000-0000-000000000004'),
        ('e0000000-0000-0000-0000-000000000009',       'c0000000-0000-0000-0000-000000000005')
    ) as subset(expense_id, participant_id)
),
ranked as (
    select expense_id, participant_id,
           count(*) over (partition by expense_id) as heads,
           row_number() over (partition by expense_id order by participant_id) as position
    from splits
)
insert into public.expense_shares (expense_id, participant_id, amount_cents)
select r.expense_id,
       r.participant_id,
       e.amount_cents / r.heads + case when r.position <= e.amount_cents % r.heads then 1 else 0 end
from ranked r
join public.expenses e on e.id = r.expense_id;

-- Two of them have already settled part of what they owed.
insert into public.payments (id, trip_id, from_participant_id, to_participant_id, amount_cents, paid_on, created_by) values
    ('f0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 10000, '2026-12-22', 'c0000000-0000-0000-0000-000000000004'),
    ('f0000000-0000-0000-0000-000000000002', 'aa15ac1a-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001',  5000, '2026-12-22', 'c0000000-0000-0000-0000-000000000005');
