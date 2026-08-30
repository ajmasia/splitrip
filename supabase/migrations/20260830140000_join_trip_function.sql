-- Joining reads an invitation that the person joining cannot read: the policy on `invitations`
-- only serves members, so an outsider cannot learn that a trip exists by guessing at tokens. This
-- function reads it for them and hands back the participant they became.
--
--   SP010  the invitation does not exist, or has been revoked
--   SP011  the invitation has expired
--   SP012  a name is required
--   SP013  somebody on the trip already goes by that name
--
-- SP013 is one rejection with two readings, because the database cannot tell them apart: a second
-- traveller who happens to share a name, and the same traveller arriving from a new phone. The
-- interface asks which it is, and comes back with p_continue_as_existing when the answer is the
-- second. Anybody holding the invitation can therefore claim any name on the trip — that is the
-- price of joining without an account, and the reason invitations expire and can be revoked.

create function public.join_trip(
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
            raise exception 'Somebody on this trip already goes by that name'
                using errcode = 'SP013';
        end if;

        -- The role stays as it was: an invitation grants a role to somebody arriving, and this
        -- person is already here.
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

revoke execute on function public.join_trip(text, text, boolean) from public;
grant execute on function public.join_trip(text, text, boolean) to authenticated;
