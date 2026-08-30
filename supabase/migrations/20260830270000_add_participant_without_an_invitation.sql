-- Not everybody on a trip is going to hold a phone. A child counts in the split and pays nothing; a
-- grandmother comes along and is not going to install anything. Until now the only door into a trip
-- was an invitation, which means a session, which means somebody has to be using the application to
-- exist in it at all.
--
-- So a participant's session becomes optional. Nothing about authorisation changes: every policy
-- and every function compares `user_id` against `auth.uid()`, and a NULL is simply never a match —
-- the row belongs to nobody in particular and is written only by an organiser through the function
-- below. The uniqueness constraint ignores nulls too, so any number of them can sit on one trip.
--
--   SP026  that name belongs to somebody on the trip who has no device yet
--
-- which is deliberately not SP013. Taking up an unused place and displacing somebody's device are
-- different acts, and the interface has to be able to say which one it is asking about.

alter table public.participants alter column user_id drop not null;

comment on column public.participants.user_id is
    'The device or account this participant answers from, or NULL for somebody the organiser added
     by name. A NULL never matches auth.uid(), so such a row grants nobody anything until somebody
     claims it through an invitation.';

create function public.add_participant(
    p_trip_id uuid,
    p_display_name text,
    p_role text default 'participant'
)
returns public.participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_author public.participants;
    v_name text := btrim(coalesce(p_display_name, ''));
    v_participant public.participants;
begin
    v_author := public.caller_participant(p_trip_id);
    perform public.assert_trip_open(p_trip_id);

    if v_author.role <> 'admin' then
        raise exception 'Only an organiser adds somebody to the trip' using errcode = 'SP018';
    end if;

    if v_name = '' then
        raise exception 'A name is required' using errcode = 'SP012';
    end if;

    if p_role is null or p_role not in ('admin', 'participant') then
        raise exception 'That is not a role' using errcode = 'SP019';
    end if;

    -- The same check `join_trip` makes, and for the same reason: two people answering to one name
    -- on one trip is a bill nobody can read.
    if exists (
        select 1 from public.participants p
        where p.trip_id = p_trip_id
          and lower(btrim(p.display_name)) = lower(v_name)
    ) then
        raise exception 'Somebody on this trip already goes by that name' using errcode = 'SP013';
    end if;

    insert into public.participants (trip_id, user_id, display_name, role)
    values (p_trip_id, null, v_name, p_role)
    returning * into v_participant;

    return v_participant;
end;
$$;

comment on function public.add_participant is
    'Adds somebody who is on the trip but not on the application. They count in splits and carry
     their own balance from the moment they exist; whoever answers for them settles it between
     themselves, which is a conversation the application does not need to be part of.';

revoke execute on function public.add_participant(uuid, text, text) from public;
grant execute on function public.add_participant(uuid, text, text) to authenticated;
