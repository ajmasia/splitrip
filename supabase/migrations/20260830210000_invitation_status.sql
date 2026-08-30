-- What a join screen is allowed to know before anybody has typed a name.
--
-- Until now a dead link rendered a form that looked perfectly usable, and only answered once a name
-- had been sent. This says so on arrival instead. It runs without a session, because the whole point
-- is that opening an invitation costs no identity, and it discloses nothing: a name, a date, the
-- trip itself, none of it. Only which of the four answers `join_trip` would have given, which is
-- exactly what whoever holds the token could already find out by using it.

create function public.invitation_status(p_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select case
        -- Revoked and never-existed are one answer, as they are in join_trip: telling them apart
        -- would confirm that a token was real once.
        when i.id is null or i.revoked_at is not null then 'invalid'
        when i.expires_at <= now() then 'expired'
        when t.status <> 'open' then 'closed'
        else 'open'
    end
    from (select 1) as always
    left join public.invitations i on i.token = p_token
    left join public.trips t on t.id = i.trip_id;
$$;

revoke execute on function public.invitation_status(text) from public;
grant execute on function public.invitation_status(text) to anon, authenticated;
