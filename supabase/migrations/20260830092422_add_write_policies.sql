-- An admin runs the trip, a participant runs their own entries, and a closed trip accepts nothing
-- but being reopened.
--
-- What has no policy stays denied, which is deliberate for anything spanning more than one row: an
-- expense and its shares are created together or not at all, so they go through functions instead.

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
