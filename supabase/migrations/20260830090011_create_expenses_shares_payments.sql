-- Two rules that span tables and are therefore enforced with composite foreign keys rather than
-- trusted to the caller: a `contribution` creates no debt so it can have no shares, and money only
-- moves between participants of the same trip.
--
-- The references to participants are DEFERRABLE so that deleting a whole trip can cascade in any
-- order; checked at every statement otherwise, which is what refuses to delete a participant who
-- still carries money.

alter table public.participants
    add constraint participants_id_trip_id_key unique (id, trip_id);

create table public.expenses (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    type text not null default 'shared',
    description text not null,
    amount_cents bigint not null,
    currency text not null default 'EUR',
    spent_on date not null default current_date,
    paid_by uuid not null,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    constraint expenses_description_not_blank check (btrim(description) <> ''),
    constraint expenses_amount_positive check (amount_cents > 0),
    constraint expenses_currency_supported check (currency = 'EUR'),
    constraint expenses_type_known check (type in ('shared', 'contribution')),
    constraint expenses_payer_in_trip foreign key (paid_by, trip_id)
        references public.participants (id, trip_id) deferrable initially immediate,
    constraint expenses_author_in_trip foreign key (created_by, trip_id)
        references public.participants (id, trip_id) deferrable initially immediate,
    constraint expenses_id_type_key unique (id, type)
);

comment on column public.expenses.spent_on is
    'The day of the trip the money was spent, as a civil date with no time and no zone, so a
     dinner does not move to the next day because of the destination time difference.';

create index expenses_trip_id_spent_on_idx on public.expenses (trip_id, spent_on desc);

create index expenses_paid_by_idx on public.expenses (paid_by);

create table public.expense_shares (
    expense_id uuid not null,
    participant_id uuid not null,
    expense_type text not null default 'shared',
    amount_cents bigint not null,
    primary key (expense_id, participant_id),
    constraint expense_shares_amount_not_negative check (amount_cents >= 0),
    constraint expense_shares_only_on_shared_expenses check (expense_type = 'shared'),
    constraint expense_shares_expense_fkey foreign key (expense_id, expense_type)
        references public.expenses (id, type) on delete cascade on update cascade,
    constraint expense_shares_participant_fkey foreign key (participant_id)
        references public.participants (id) deferrable initially immediate
);

comment on column public.expense_shares.expense_type is
    'Mirrors the type of the referenced expense so the foreign key can pin it to `shared`. It is
     what makes "a contribution has no shares" a guarantee of the database rather than a habit.';

create index expense_shares_participant_id_idx on public.expense_shares (participant_id);

create table public.payments (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    from_participant_id uuid not null,
    to_participant_id uuid not null,
    amount_cents bigint not null,
    currency text not null default 'EUR',
    paid_on date not null default current_date,
    voided_at timestamptz,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    constraint payments_amount_positive check (amount_cents > 0),
    constraint payments_currency_supported check (currency = 'EUR'),
    constraint payments_parties_distinct check (from_participant_id <> to_participant_id),
    constraint payments_payer_in_trip foreign key (from_participant_id, trip_id)
        references public.participants (id, trip_id) deferrable initially immediate,
    constraint payments_payee_in_trip foreign key (to_participant_id, trip_id)
        references public.participants (id, trip_id) deferrable initially immediate,
    constraint payments_author_in_trip foreign key (created_by, trip_id)
        references public.participants (id, trip_id) deferrable initially immediate
);

comment on column public.payments.voided_at is
    'A payment recorded by mistake is voided, never deleted: the trip keeps the trace of what
     happened, and a voided payment stops counting towards the balances.';

create index payments_trip_id_idx on public.payments (trip_id);
create index payments_from_participant_id_idx on public.payments (from_participant_id);
create index payments_to_participant_id_idx on public.payments (to_participant_id);
