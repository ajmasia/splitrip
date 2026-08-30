-- An invitation that names the seat it opens.
--
-- The general link stays: a QR on the table and five people are in, which is the fastest way into a
-- trip there is. But it asks its holder to type a name, and typing a name is where a grandmother
-- ends up as a second Abuela, and where somebody can walk into a place that was not theirs. When
-- the organiser knows who they are inviting — which, having just added them by name, they do — the
-- link can carry that instead, and there is nothing left to get wrong.
--
-- It also closes a gap the design admits to: losing a device meant losing access, recoverable only
-- by rejoining under exactly the right name. An organiser can now hand somebody back their own
-- place deliberately.
--
--   SP027  this invitation is for a place somebody else is already using
--
-- because a link that names one seat should not quietly take it from whoever is sitting there. The
-- general link keeps its own answer for that, where displacing is a choice the reader is offered.

alter table public.invitations
    add column participant_id uuid,
    add constraint invitations_participant_in_trip
        foreign key (participant_id, trip_id)
        references public.participants (id, trip_id) on delete cascade;

comment on column public.invitations.participant_id is
    'The place this invitation opens, or NULL for the general link that lets whoever holds it type
     a name. Bound to the trip as well as to the participant, so an invitation cannot name somebody
     from another trip.';

-- Dropped rather than replaced: an argument added to the end is a different function as far as
-- Postgres is concerned, and leaving both would make every call ambiguous.
drop function public.create_invitation(uuid, text, integer);

create function public.create_invitation(
    p_trip_id uuid,
    p_role text default 'participant',
    p_expires_in_days integer default 30,
    p_participant_id uuid default null
)
returns public.invitations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text := coalesce(p_role, 'participant');
    v_days integer := coalesce(p_expires_in_days, 30);
    v_participant public.participants;
    v_invitation public.invitations;
begin
    if auth.uid() is null then
        raise exception 'Inviting somebody needs a session' using errcode = '42501';
    end if;

    -- An outsider and a mere participant are refused alike, and told the same thing: that this
    -- needs an organiser. Neither learns whether the trip exists.
    if not public.is_trip_admin(p_trip_id) then
        raise exception 'Inviting somebody needs admin permissions' using errcode = 'SP018';
    end if;

    perform public.assert_trip_open(p_trip_id);

    if v_days < 1 or v_days > 365 then
        raise exception 'An invitation lasts between a day and a year' using errcode = 'SP020';
    end if;

    if p_participant_id is not null then
        select * into v_participant from public.participants p
        where p.id = p_participant_id and p.trip_id = p_trip_id;

        if not found then
            raise exception 'That person is not on this trip' using errcode = 'SP007';
        end if;

        -- The role travels with the place, not with the link: whoever opens it becomes the person
        -- who is already on the list, and that person already has a role.
        v_role := v_participant.role;

        -- One live link per place. Handing somebody the same seat twice should not leave a pile of
        -- links, each of which opens it.
        select * into v_invitation from public.invitations i
        where i.participant_id = p_participant_id
          and i.revoked_at is null
          and i.expires_at > now()
        order by i.created_at desc
        limit 1;

        if found then
            return v_invitation;
        end if;
    end if;

    -- Checked here rather than on the way in: an invitation for a place takes its role from the
    -- place, so what the caller sent about a role is not a question until there is no place.
    if v_role not in ('admin', 'participant') then
        raise exception 'An invitation brings somebody in as an admin or as a participant'
            using errcode = 'SP019';
    end if;

    insert into public.invitations (trip_id, token, role, expires_at, created_by, participant_id)
    values (
        p_trip_id,
        public.new_invitation_token(),
        v_role,
        now() + make_interval(days => v_days),
        auth.uid(),
        p_participant_id
    )
    returning * into v_invitation;

    return v_invitation;
end;
$$;

comment on function public.create_invitation is
    'Mints an invitation to a trip, or hands back the live one a place already has. Given a
     participant, the link opens that place and nothing else; given none, it is the general link
     whoever holds it joins through by typing a name.';

revoke execute on function public.create_invitation(uuid, text, integer, uuid) from public;
grant execute on function public.create_invitation(uuid, text, integer, uuid) to authenticated;

-- Joining through a link that names a place: there is nothing to type and nothing to choose.
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

        if v_participant.user_id is not null then
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

-- What the join screen may know before anybody does anything: whose place this link opens, if it
-- opens one in particular. Named rather than the participant's identifier, because the screen has
-- nothing else it may read about a trip it is not yet part of.
create or replace function public.invitation_place(p_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select p.display_name
    from public.invitations i
    join public.participants p on p.id = i.participant_id
    where i.token = p_token
      and i.revoked_at is null
      and i.expires_at > now()
      and p.user_id is null;
$$;

revoke execute on function public.invitation_place(text) from public;
grant execute on function public.invitation_place(text) to anon, authenticated;
