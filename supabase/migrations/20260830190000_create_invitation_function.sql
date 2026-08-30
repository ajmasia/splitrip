-- An invitation is a bearer token: whoever holds it gets into the trip. Its only protection is
-- that it cannot be guessed, so the token is not something a client is trusted to choose. This
-- function is the door, and the INSERT policy that used to stand beside it is removed, the way
-- `trips` and `participants` have none because `create_trip` is their door.
--
--   SP018  inviting somebody needs admin permissions
--   SP019  an invitation carries a role that is not one of the two
--   SP020  the expiry asked for is outside the range an invitation may last

drop policy "Admins invite to their trip" on public.invitations;

create function public.new_invitation_token()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
    -- 16 bytes is 128 bits, which base64 renders as 24 characters with two of padding. Rewriting
    -- the two characters that do not survive a URL and dropping the padding leaves 22, exactly the
    -- length `invitations_token_long_enough` insists on.
    select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

comment on function public.new_invitation_token is
    'A fresh invitation token: 128 bits from the cryptographically secure generator pgcrypto wraps,
     encoded for a URL. Not granted to anybody — an invitation is minted by create_invitation.';

create function public.create_invitation(
    p_trip_id uuid,
    p_role text default 'participant',
    p_expires_in_days integer default 30
)
returns public.invitations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text := coalesce(p_role, 'participant');
    v_days integer := coalesce(p_expires_in_days, 30);
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

    if v_role not in ('admin', 'participant') then
        raise exception 'An invitation brings somebody in as an admin or as a participant'
            using errcode = 'SP019';
    end if;

    if v_days < 1 or v_days > 365 then
        raise exception 'An invitation lasts between a day and a year' using errcode = 'SP020';
    end if;

    insert into public.invitations (trip_id, token, role, expires_at, created_by)
    values (
        p_trip_id,
        public.new_invitation_token(),
        v_role,
        now() + make_interval(days => v_days),
        auth.uid()
    )
    returning * into v_invitation;

    return v_invitation;
end;
$$;

comment on function public.create_invitation is
    'Mints an invitation to a trip, carrying the role whoever uses it joins with. Thirty days by
     default: long enough to outlast a trip being planned, short enough that a link left in a chat
     stops working before the next one.';

revoke execute on function public.new_invitation_token() from public;
revoke execute on function public.create_invitation(uuid, text, integer) from public;
grant execute on function public.create_invitation(uuid, text, integer) to authenticated;
