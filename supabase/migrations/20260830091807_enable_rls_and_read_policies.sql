-- A trip is readable only by the people who take part in it.
--
-- Membership is resolved by SECURITY DEFINER helpers because a policy on `participants` that
-- queried `participants` under RLS would recurse forever.
--
-- Reads only: RLS with no policy for a command refuses it, so writes stay denied until the next
-- migration.

create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.participants p
        where p.trip_id = p_trip_id and p.user_id = auth.uid()
    );
$$;

-- `expense_shares` is reached through its expense: it carries no trip of its own.
create function public.is_trip_member_of_expense(p_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.expenses e
        join public.participants p on p.trip_id = e.trip_id
        where e.id = p_expense_id and p.user_id = auth.uid()
    );
$$;

alter table public.trips enable row level security;
alter table public.participants enable row level security;
alter table public.invitations enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.payments enable row level security;
alter table public.activity enable row level security;

create policy "Participants read their trips"
    on public.trips for select to authenticated
    using (public.is_trip_member(id));

create policy "Participants read who else is on the trip"
    on public.participants for select to authenticated
    using (public.is_trip_member(trip_id));

-- Only from the inside: someone holding an invitation joins through the join function, which reads
-- it with its own permissions. Reading invitations directly would tell an outsider that a trip
-- exists and who it belongs to.
create policy "Participants read the invitations of their trips"
    on public.invitations for select to authenticated
    using (public.is_trip_member(trip_id));

create policy "Participants read the expenses of their trips"
    on public.expenses for select to authenticated
    using (public.is_trip_member(trip_id));

create policy "Participants read the shares of their trips"
    on public.expense_shares for select to authenticated
    using (public.is_trip_member_of_expense(expense_id));

create policy "Participants read the payments of their trips"
    on public.payments for select to authenticated
    using (public.is_trip_member(trip_id));

create policy "Participants read the activity of their trips"
    on public.activity for select to authenticated
    using (public.is_trip_member(trip_id));
