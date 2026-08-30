-- Row Level Security: a trip is only visible to the people who take part in it.
--
-- This is the gravest risk in the design. A bug here does not show up as a broken screen, it shows
-- up as one group reading another group's money. So isolation lives next to the data, where no
-- application route can bypass it by oversight, and every table is covered — including the ones
-- that carry no `trip_id` of their own.
--
-- Membership is resolved by SECURITY DEFINER helpers on purpose. A policy on `participants` that
-- queried `participants` under RLS would recurse forever; a helper that runs as its owner reads the
-- membership once and answers a plain yes or no, which is all the policy needs to know.
--
-- Reads only. Writes stay denied — RLS with no policy for a command refuses it — until the write
-- policies distinguishing an admin from a participant land in the next migration.

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

comment on function public.is_trip_member(uuid) is
    'Does the current session take part in this trip? SECURITY DEFINER so that policies on
     `participants` can ask it without the question recursing into the policy that asked.';

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
