-- Who may change what: an admin runs the trip, a participant runs their own entries.
--
-- The rule from `trip-management`, expressed as policies: an admin edits the trip, invites, removes
-- participants, changes roles and edits or deletes any expense; a participant may only touch what
-- they recorded themselves. A closed trip is read-only for everyone, so the write policies check
-- that the trip is open — reopening it is the one change a closed trip still accepts, from an admin.
--
-- What has no policy stays denied, and that is deliberate for the operations that span more than
-- one row. Creating an expense with its shares, or a trip with its first admin, must be atomic;
-- allowing a client to write half of it by hand would let a failed second write leave an expense
-- with no split. Those go through functions, which run with their own permissions.

create function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.participants p
        where p.trip_id = p_trip_id and p.user_id = auth.uid() and p.role = 'admin'
    );
$$;

create function public.is_trip_open(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (select 1 from public.trips t where t.id = p_trip_id and t.status = 'open');
$$;

-- Is this participant row me? Expenses and payments name their author as a participant, not as an
-- auth user, so ownership has to be resolved through the participant.
create function public.is_me(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.participants p
        where p.id = p_participant_id and p.user_id = auth.uid()
    );
$$;

-- The trip itself: renaming, redating, closing and reopening are the organiser's.
create policy "Admins edit their trip"
    on public.trips for update to authenticated
    using (public.is_trip_admin(id))
    with check (public.is_trip_admin(id));

-- Roles are the organiser's to change; keeping at least one admin is checked where the change is
-- made, since a policy can only judge one row at a time.
create policy "Admins change roles on their trip"
    on public.participants for update to authenticated
    using (public.is_trip_admin(trip_id) and public.is_trip_open(trip_id))
    with check (public.is_trip_admin(trip_id));

create policy "Admins remove participants from their trip"
    on public.participants for delete to authenticated
    using (public.is_trip_admin(trip_id) and public.is_trip_open(trip_id));

create policy "Admins invite to their trip"
    on public.invitations for insert to authenticated
    with check (public.is_trip_admin(trip_id) and public.is_trip_open(trip_id));

create policy "Admins revoke invitations of their trip"
    on public.invitations for update to authenticated
    using (public.is_trip_admin(trip_id))
    with check (public.is_trip_admin(trip_id));

-- An expense belongs to whoever recorded it; the organiser may correct anybody's.
create policy "Authors and admins edit an expense"
    on public.expenses for update to authenticated
    using (
        public.is_trip_open(trip_id)
        and (public.is_me(created_by) or public.is_trip_admin(trip_id))
    )
    with check (
        public.is_trip_open(trip_id)
        and (public.is_me(created_by) or public.is_trip_admin(trip_id))
    );

create policy "Authors and admins delete an expense"
    on public.expenses for delete to authenticated
    using (
        public.is_trip_open(trip_id)
        and (public.is_me(created_by) or public.is_trip_admin(trip_id))
    );

-- Voiding a payment: whoever recorded it, or the organiser. A payment is never deleted.
create policy "Authors and admins void a payment"
    on public.payments for update to authenticated
    using (
        public.is_trip_open(trip_id)
        and (public.is_me(created_by) or public.is_trip_admin(trip_id))
    )
    with check (
        public.is_trip_open(trip_id)
        and (public.is_me(created_by) or public.is_trip_admin(trip_id))
    );
