-- A trip to play with. Loaded into a fresh database by `npm run db:reset`.
--
-- Five of Westeros driving the filming locations that are really in the north of Spain — Gaztelugatxe
-- is Dragonstone, Zumaia is its beach, the Bardenas are the Dothraki sea — over five days, organised
-- by Tyrion. The numbers are chosen to exercise the awkward cases rather than the easy ones: an
-- 800 EUR house that Daenerys pays for on her own and asks nobody to share, everything else fronted
-- by the other four, expenses split among only some of the group, amounts that do not divide exactly
-- and leave cents over, and two settlement payments already made.
--
-- The shares are computed here with the same rule the application applies: integer division of the
-- cents, with the leftover going one by one to the first participants ordered by their identifier.
-- That is what keeps the shares of an expense adding up to the expense, to the cent.

-- Tyrion opens the trips, so he has an account. The other four joined through an invitation and
-- have only the identity their phone was given, which is what the model expects of a traveller.
--
-- Signing in locally: tyrion@splitrip.test / unViajeAPoniente
insert into public.trip_creators (email, note) values
    ('tyrion@splitrip.test', 'The organiser of the sample trip');

-- The empty token columns are not decoration: the auth server reads them into strings that cannot
-- be null, and a NULL there fails every sign-in with an error about querying the schema.
insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
) values (
    'a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'tyrion@splitrip.test',
    extensions.crypt('unViajeAPoniente', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, now(), now(),
    '', '', '', ''
);

insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
    gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000005', 'email',
    '{"sub":"a0000000-0000-0000-0000-000000000005","email":"tyrion@splitrip.test","email_verified":true}'::jsonb,
    now(), now(), now()
);

-- One anonymous identity per person, as if each had joined from their own phone.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values ('a0000000-0000-0000-0000-000000000001'::uuid),
             ('a0000000-0000-0000-0000-000000000002'::uuid),
             ('a0000000-0000-0000-0000-000000000003'::uuid),
             ('a0000000-0000-0000-0000-000000000004'::uuid)) as u(id);

insert into public.trips (id, name, start_date, end_date, created_by) values
    ('aa15ac1a-0000-0000-0000-000000000001', 'Rocadragón está en Bizkaia', '2026-12-18', '2026-12-22',
     'a0000000-0000-0000-0000-000000000005');

insert into public.participants (id, trip_id, user_id, display_name, role) values
    ('c0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Daenerys', 'participant'),
    ('c0000000-0000-0000-0000-000000000002', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Brienne',  'participant'),
    ('c0000000-0000-0000-0000-000000000003', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Jon',      'participant'),
    ('c0000000-0000-0000-0000-000000000004', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Arya',     'participant'),
    ('c0000000-0000-0000-0000-000000000005', 'aa15ac1a-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Tyrion',   'admin');

insert into public.invitations (id, trip_id, token, role, created_by) values
    ('b0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001',
     'p0n13nt3Xm2Qv7Bn9Tk3Rd', 'participant', 'a0000000-0000-0000-0000-000000000005');

insert into public.expenses (id, trip_id, type, description, amount_cents, spent_on, paid_by, created_by) values
    ('e0000000-0000-0000-0000-000000000001', 'aa15ac1a-0000-0000-0000-000000000001', 'contribution', 'Caserío en Bakio, invita Daenerys', 80000, '2026-12-18', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
    ('e0000000-0000-0000-0000-000000000002', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Alquiler de la furgoneta',    21000, '2026-12-18', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000003', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Gasolina y peajes',           11570, '2026-12-18', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
    ('e0000000-0000-0000-0000-000000000004', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Compra en el supermercado',    8733, '2026-12-18', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
    ('e0000000-0000-0000-0000-000000000005', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Cena en San Sebastián',       13240, '2026-12-19', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
    ('e0000000-0000-0000-0000-000000000006', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Vinos en el casco viejo',      2650, '2026-12-19', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
    ('e0000000-0000-0000-0000-000000000007', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Barco por el flysch de Zumaia', 3900, '2026-12-19', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000008', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Comida en Getaria',            7600, '2026-12-20', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000009', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Taxi de vuelta de las Bardenas', 2200, '2026-12-20', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
    ('e0000000-0000-0000-0000-00000000000a', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Subida a Gaztelugatxe, 241 escalones', 5500, '2026-12-21', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
    -- Daenerys also fronts an ordinary expense, so she appears both ways: 43.72 among five does
    -- not divide, and the two cents over go to the first two participants by identifier.
    ('e0000000-0000-0000-0000-00000000000d', 'aa15ac1a-0000-0000-0000-000000000001', 'shared', 'Desayunos en la panadería de Bakio', 4372, '2026-12-20', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
    -- Nobody is expected to pay these two back: they add to what the trip cost and to nobody's debt.
    ('e0000000-0000-0000-0000-00000000000b', 'aa15ac1a-0000-0000-0000-000000000001', 'contribution', 'Cena de despedida, invita Tyrion',   9500, '2026-12-21', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005');

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
        -- Tyrion stayed on dry land
        ('e0000000-0000-0000-0000-000000000007'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000002'),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000003'),
        ('e0000000-0000-0000-0000-000000000007',       'c0000000-0000-0000-0000-000000000004'),
        -- only three of them stopped for lunch in Getaria: 76.00 among 3 leaves a cent over
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
