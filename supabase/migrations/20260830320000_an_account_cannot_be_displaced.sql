-- An organiser pressed "invite again" beside their own name, opened the link on a phone with no
-- session, and lost their trip. The phone took the place, the account stopped being a participant,
-- and there was no way back: not being a member, it could not invite itself either.
--
-- The rule that was missing: a place held by an account is never taken from a link. An account has
-- its own way in — signing in — so it never needs one of these, and allowing it is the only way to
-- lock somebody out of their own trip for good. A place held by a device is another matter: that is
-- exactly the lost phone this exists for, and it is still taken by confirming.
--
--   SP029  that place belongs to an account, and is entered by signing in
--
-- The rule applies to both doors, because typing a name on the general link reaches the same place
-- as opening a link that names it.

-- Whether a place may change hands, and why not when it may not. Both doors ask this, so the rule
-- lives in one place and cannot be enforced on one of them and forgotten on the other.
create function public.assert_place_can_be_taken(
    p_participant public.participants,
    p_confirmed boolean
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if p_participant.user_id is null then
        return;
    end if;

    if exists (
        select 1 from auth.users u
        where u.id = p_participant.user_id and coalesce(u.is_anonymous, false) = false
    ) then
        raise exception 'That place belongs to an account and is entered by signing in'
            using errcode = 'SP029', detail = p_participant.display_name;
    end if;

    if not p_confirmed then
        raise exception 'That place is already being used from another device'
            using errcode = 'SP027', detail = p_participant.display_name;
    end if;
end;
$$;

revoke execute on function public.assert_place_can_be_taken(public.participants, boolean) from public;

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

        perform public.assert_place_can_be_taken(v_participant, p_continue_as_existing);

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

        perform public.assert_place_can_be_taken(v_participant, true);

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

-- A third thing the join screen needs: whether this place could change hands at all. A place held
-- by an account never can, and offering a button that will be refused is worse than saying so.
drop function public.invitation_place(text);

create function public.invitation_place(p_token text)
returns table (display_name text, in_use boolean, takeable boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        p.display_name,
        p.user_id is not null,
        p.user_id is null or exists (
            select 1 from auth.users u
            where u.id = p.user_id and coalesce(u.is_anonymous, false) = true
        )
    from public.invitations i
    join public.participants p on p.id = i.participant_id
    where i.token = p_token
      and i.revoked_at is null
      and i.expires_at > now();
$$;

revoke execute on function public.invitation_place(text) from public;
grant execute on function public.invitation_place(text) to anon, authenticated;
