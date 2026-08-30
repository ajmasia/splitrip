-- Rules that no application path may bypass live here as constraints rather than in code.

create table public.trips (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    start_date date,
    end_date date,
    currency text not null default 'EUR',
    status text not null default 'open',
    summary jsonb,
    closed_at timestamptz,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint trips_name_not_blank check (btrim(name) <> ''),
    constraint trips_currency_supported check (currency = 'EUR'),
    constraint trips_status_known check (status in ('open', 'closed')),
    constraint trips_dates_ordered check (
        start_date is null or end_date is null or end_date >= start_date
    ),
    constraint trips_summary_requires_closed check (summary is null or status = 'closed'),
    constraint trips_closed_at_matches_status check ((status = 'closed') = (closed_at is not null))
);

comment on column public.trips.currency is
    'Base currency. Only EUR is accepted in this release; the column exists from day one so adding
     conversion later needs no retroactive decision about historical expenses.';

comment on column public.trips.summary is
    'Closing summary frozen when the trip is closed, so it cannot drift while the trip stays closed.';

create table public.participants (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete restrict,
    display_name text not null,
    role text not null default 'participant',
    joined_at timestamptz not null default now(),
    constraint participants_display_name_not_blank check (btrim(display_name) <> ''),
    constraint participants_role_known check (role in ('admin', 'participant')),
    constraint participants_one_per_user_per_trip unique (trip_id, user_id)
);

comment on column public.participants.user_id is
    'The device identity that joined, as an anonymous Supabase auth user. ON DELETE RESTRICT: a
     participant carries balances, so their identity must not disappear from underneath them.';

create unique index participants_display_name_unique_per_trip
    on public.participants (trip_id, lower(btrim(display_name)));

create index participants_user_id_idx on public.participants (user_id);

create table public.invitations (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    token text not null,
    role text not null default 'participant',
    expires_at timestamptz not null default (now() + interval '30 days'),
    revoked_at timestamptz,
    created_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint invitations_token_unique unique (token),
    constraint invitations_token_long_enough check (char_length(token) >= 22),
    constraint invitations_role_known check (role in ('admin', 'participant'))
);

comment on column public.invitations.token is
    'Unguessable identifier carried in the invitation URL. At least 128 bits of entropy from a
     cryptographically secure generator, which is 22 characters once base64url-encoded.';

create index invitations_trip_id_idx on public.invitations (trip_id);
