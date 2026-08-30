-- Opening a trip needs an allowed account; joining one still needs nothing at all. They are
-- different powers, and only this one has to be bounded: a deployment reachable from the public
-- internet, that hands an identity to whoever asks and lets that identity create data, is somebody
-- else's free hosting waiting to be found.
--
-- The bound is a table rather than a setting. GoTrue offers no way to keep email logins open while
-- closing email sign-ups — the switch for the one closes the other, and the global switch closes
-- anonymous sign-ins too, which would take the invitations down with it. So the list lives here,
-- where it is enforced by the only door into `trips`, travels in a migration, and can be tested.
--
--   SP017  creating a trip needs an allowed account

create table public.trip_creators (
    email text primary key,
    note text,
    added_at timestamptz not null default now(),
    constraint trip_creators_email_lowercase check (email = lower(btrim(email)))
);

comment on table public.trip_creators is
    'Who may open new trips on this instance. Listed by email rather than by user id so somebody
     can be allowed before their account exists.';

alter table public.trip_creators enable row level security;

-- No policy, deliberately: the list is nobody's business but the instance owner's, and the only
-- thing that reads it is a SECURITY DEFINER function.

create or replace function public.create_trip(
    p_name text,
    p_display_name text,
    p_start_date date default null,
    p_end_date date default null
)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_display_name text := btrim(coalesce(p_display_name, ''));
    v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
    v_trip public.trips;
begin
    if auth.uid() is null then
        raise exception 'Creating a trip needs a session' using errcode = '42501';
    end if;

    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
       or v_email = ''
       or not exists (select 1 from public.trip_creators c where c.email = v_email)
    then
        raise exception 'Creating a trip needs an allowed account' using errcode = 'SP017';
    end if;

    if v_name = '' then
        raise exception 'A trip needs a name' using errcode = 'SP015';
    end if;

    if v_display_name = '' then
        raise exception 'A name is required' using errcode = 'SP012';
    end if;

    if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
        raise exception 'A trip cannot end before it starts' using errcode = 'SP016';
    end if;

    insert into public.trips (name, start_date, end_date, created_by)
    values (v_name, p_start_date, p_end_date, auth.uid())
    returning * into v_trip;

    insert into public.participants (trip_id, user_id, display_name, role)
    values (v_trip.id, auth.uid(), v_display_name, 'admin');

    return v_trip;
end;
$$;
