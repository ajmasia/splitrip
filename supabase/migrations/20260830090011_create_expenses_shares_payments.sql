-- Expenses, their shares and the payments that settle them: the money.
--
-- Every amount is an integer number of cents. No floating-point type ever touches money, so the
-- sum of the shares equals the expense to the cent, always and reproducibly.
--
-- Two rules that no application path may bypass are enforced here rather than in code:
--
--   * A `contribution` adds to the trip total but creates no debt, so it has no shares. Because
--     that spans two tables, it is enforced with a composite foreign key against `(id, type)` of
--     the expense plus a CHECK pinning the referenced type to `shared`: attaching a share to a
--     contribution is rejected, and so is turning an expense with shares into a contribution.
--   * Money only moves between participants of the same trip. The composite foreign keys against
--     `(id, trip_id)` of `participants` make a payer, a payee or an author from another trip
--     impossible to record, without the tables having to trust the caller.
--
-- Participant references neither cascade nor restrict: a participant carrying expenses or
-- payments simply cannot be deleted, which is the rule the trip requires — their money would be
-- left dangling. They are declared DEFERRABLE INITIALLY IMMEDIATE, so they are checked at every
-- statement as usual, and deleting a whole trip is still possible by asking for them to be
-- deferred first (SET CONSTRAINTS ALL DEFERRED): the cascade then reaches participants, expenses
-- and payments in whatever order it likes, and by commit there is nothing left pointing anywhere.

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

comment on column public.expenses.amount_cents is
    'Amount in integer cents. Always strictly positive: an expense of nothing is not an expense.';
comment on column public.expenses.spent_on is
    'The day of the trip the money was spent, as a civil date with no time and no zone, so a
     dinner does not move to the next day because of the destination time difference.';
comment on column public.expenses.paid_by is
    'Who fronted the money, which is not necessarily who recorded the expense.';

-- The trip screen lists expenses most recent first; this is that query.
create index expenses_trip_id_spent_on_idx on public.expenses (trip_id, spent_on desc);

-- Answers "what has this participant paid?", for balances and for the removal check.
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
comment on column public.expense_shares.amount_cents is
    'What this participant is charged for this expense. Zero is legitimate: one cent split three
     ways charges 1, 0 and 0.';

-- Answers "what has this participant been charged?", the other half of every balance.
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
