-- Every function that writes already refuses a closed trip. What was left were the two writes that
-- still go through a policy and never asked: renaming a trip, and revoking one of its invitations.
--
-- Reopening is the single change a closed trip accepts, and it is `reopen_trip` that makes it. So
-- the policy on `trips` can require the trip to be open without walling anybody in.

alter policy "Admins edit their trip" on public.trips
    using (public.is_trip_admin(id) and public.is_trip_open(id))
    with check (public.is_trip_admin(id) and public.is_trip_open(id));

alter policy "Admins revoke invitations of their trip" on public.invitations
    using (public.is_trip_admin(trip_id) and public.is_trip_open(trip_id))
    with check (public.is_trip_admin(trip_id) and public.is_trip_open(trip_id));
