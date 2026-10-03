-- What the people using the application tell whoever runs it: something broken, an idea, anything
-- else, sent from the screen where it happened. Anybody may send it, a device identity included;
-- only the instance's operators may read it, the sender included among those who may not.
--
-- Identities are free to obtain, so the limits are kept here and not left to the form: a message
-- has a maximum length, and one identity sends only a few within an hour.
--
--   SP031  a message is required
--   SP032  the message is longer than 2,000 characters
--   SP033  too many messages from this identity within the hour

create table public.feedback (
    id uuid primary key default gen_random_uuid(),
    -- Kept for the rate limit only; the operators' screen does not show it.
    user_id uuid not null references auth.users (id) on delete cascade,
    kind text not null default 'other',
    message text not null,
    path text,
    app_version text,
    locale text,
    -- Deleting a trip keeps what was said from inside it.
    trip_id uuid references public.trips (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint feedback_kind check (kind in ('bug', 'idea', 'other')),
    constraint feedback_message_length check (
        message = btrim(message) and char_length(message) between 1 and 2000),
    constraint feedback_path_length check (char_length(path) <= 512),
    constraint feedback_app_version_length check (char_length(app_version) <= 64),
    constraint feedback_locale check (locale in ('es', 'en'))
);

comment on table public.feedback is
    'Messages the application''s users send to whoever runs the instance. Written only through
     submit_feedback, read only by operators.';

create index feedback_user_recent on public.feedback (user_id, created_at);

alter table public.feedback enable row level security;

-- Reading is for operators. There is no policy for writing: the only way in is the function below,
-- which the limits need anyway, since a policy cannot count the caller's other rows comfortably.
create policy feedback_read_by_operators on public.feedback
    for select to authenticated
    using (public.is_operator());

create function public.submit_feedback(
    p_message text,
    p_kind text default null,
    p_path text default null,
    p_trip_id uuid default null,
    p_app_version text default null,
    p_locale text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_message text := regexp_replace(coalesce(p_message, ''), '^\s+|\s+$', '', 'g');
    v_path text := p_path;
begin
    if auth.uid() is null then
        raise exception 'Sending feedback needs a session' using errcode = '42501';
    end if;

    if v_message = '' then
        raise exception 'A message is required' using errcode = 'SP031';
    end if;

    if char_length(v_message) > 2000 then
        raise exception 'A message is at most 2000 characters' using errcode = 'SP032';
    end if;

    -- One identity's submissions are counted one at a time, so two sent together cannot both slip
    -- under the limit.
    perform pg_advisory_xact_lock(hashtextextended('feedback:' || auth.uid()::text, 0));

    if (select count(*) from public.feedback f
        where f.user_id = auth.uid() and f.created_at > now() - interval '1 hour') >= 5
    then
        raise exception 'Too many messages within the hour' using errcode = 'SP033';
    end if;

    -- Only a screen of ours: a path within the application, never another site's address, which
    -- browsers also read into `//host` and `/\host`.
    if v_path is null
       or left(v_path, 1) <> '/' or left(v_path, 2) in ('//', '/\')
       or char_length(v_path) > 512
    then
        v_path := null;
    end if;

    -- A trip the caller is not in is dropped without a word: refusing would tell anybody which
    -- trip identifiers exist.
    insert into public.feedback (user_id, kind, message, path, app_version, locale, trip_id)
    values (
        auth.uid(),
        coalesce(nullif(btrim(p_kind), ''), 'other'),
        v_message,
        v_path,
        left(p_app_version, 64),
        p_locale,
        case when p_trip_id is not null and public.is_trip_member(p_trip_id) then p_trip_id end
    );
end;
$$;

-- The operators' list, with the name of the trip each message was sent from. Read through here
-- rather than from the table because the trip's name is behind the trip's own policies, which an
-- operator on no trip does not pass; this hands over the name and nothing else of it. Anybody who
-- is not an operator gets an empty list, the same answer as when nothing has been sent.
create function public.operator_feedback()
returns table (
    id uuid,
    kind text,
    message text,
    path text,
    app_version text,
    locale text,
    trip_name text,
    created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select f.id, f.kind, f.message, f.path, f.app_version, f.locale, t.name, f.created_at
    from public.feedback f
    left join public.trips t on t.id = f.trip_id
    where public.is_operator()
    order by f.created_at desc, f.id desc;
$$;
