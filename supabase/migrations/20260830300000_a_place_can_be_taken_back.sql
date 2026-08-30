-- A link for a place somebody is already using had no way forward, which made "invite again" a
-- button that led nowhere — and losing a phone is precisely what it is for.
--
-- It is now the same shape as everything else here: a place is taken by confirming, never in
-- silence. The screen says the place is in use, and whoever holds the link says whether that is
-- them on a new phone. That is the same bargain the general link already strikes, and the price of
-- travelling without accounts: whoever holds an invitation can be whoever it names. Invitations
-- expire, can be revoked, and are minted one at a time by an organiser, which is what bounds it.

create or replace function public.join_trip(
    p_token text,
    p_display_name text default null,
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

    if v_invitation.participant_id is not null then
        select * into v_participant from public.participants p
        where p.id = v_invitation.participant_id;

        if v_participant.user_id is not null and not p_continue_as_existing then
            raise exception 'That place is already being used from another device'
                using errcode = 'SP027', detail = v_participant.display_name;
        end if;

        update public.participants set user_id = auth.uid()
         where id = v_participant.id
        returning * into v_participant;

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

-- The screen needs both halves to word its question: whose place this is, and whether somebody is
-- sitting in it. Naming it was never enough — a link for a place in use fell through to the form
-- that asks for a name, which is the one question a link like this exists to avoid.
drop function public.invitation_place(text);

create function public.invitation_place(p_token text)
returns table (display_name text, in_use boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select p.display_name, p.user_id is not null
    from public.invitations i
    join public.participants p on p.id = i.participant_id
    where i.token = p_token
      and i.revoked_at is null
      and i.expires_at > now();
$$;

revoke execute on function public.invitation_place(text) from public;
grant execute on function public.invitation_place(text) to anon, authenticated;
