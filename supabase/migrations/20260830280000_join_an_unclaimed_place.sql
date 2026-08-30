-- A name already on the trip had one answer for two situations, and they are not the same act.
--
-- Somebody the organiser added by name is a place with nobody in it: claiming it is what it is
-- there for, and everything already recorded against it — expenses, splits, balance — is what the
-- claimant walks in with. A name a device is already answering to is somebody else's seat, and
-- taking it puts that device out of the trip. Both remain possible; only one of them is routine.
--
--   SP026  that name belongs to somebody on the trip who has no device yet
--
-- so the screen can ask the right question. Confirming is still required for both: a second Abuela
-- exists as readily as a second Ana.

create or replace function public.join_trip(
    p_token text,
    p_display_name text,
    p_continue_as_existing boolean default false
)
returns public.participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invitation public.invitations;
    v_name text := btrim(coalesce(p_display_name, ''));
    v_participant public.participants;
begin
    if auth.uid() is null then
        raise exception 'Joining a trip needs a session' using errcode = '42501';
    end if;

    select * into v_invitation from public.invitations i where i.token = p_token;
    if not found or v_invitation.revoked_at is not null then
        raise exception 'That invitation is not valid' using errcode = 'SP010';
    end if;

    if v_invitation.expires_at <= now() then
        raise exception 'That invitation has expired' using errcode = 'SP011';
    end if;

    perform public.assert_trip_open(v_invitation.trip_id);

    -- Already in from this device. The name typed is ignored rather than applied: joining twice
    -- is how somebody returns to a trip, not how they rename themselves.
    select * into v_participant from public.participants p
    where p.trip_id = v_invitation.trip_id and p.user_id = auth.uid();
    if found then
        return v_participant;
    end if;

    if v_name = '' then
        raise exception 'A name is required to join' using errcode = 'SP012';
    end if;

    select * into v_participant from public.participants p
    where p.trip_id = v_invitation.trip_id
      and lower(btrim(p.display_name)) = lower(v_name);

    if found then
        if not p_continue_as_existing then
            -- The name travels back as it stands on the list, not as it was typed: somebody being
            -- shown their own place should see it spelled the way the organiser wrote it.
            if v_participant.user_id is null then
                raise exception 'That place on the trip has nobody on it yet'
                    using errcode = 'SP026', detail = v_participant.display_name;
            end if;

            raise exception 'Somebody on this trip already goes by that name'
                using errcode = 'SP013', detail = v_participant.display_name;
        end if;

        -- The role stays as it was: an invitation grants a role to somebody arriving, and this
        -- person is already here. Their expenses and balance stay too, because nothing about them
        -- is being created — a session is being attached to a participant that already exists.
        update public.participants set user_id = auth.uid()
         where id = v_participant.id
        returning * into v_participant;

        return v_participant;
    end if;

    insert into public.participants (trip_id, user_id, display_name, role)
    values (v_invitation.trip_id, auth.uid(), v_name, v_invitation.role)
    returning * into v_participant;

    return v_participant;
end;
$$;
