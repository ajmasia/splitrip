-- A trip with nobody in it is not a trip: creating one and recording its first organiser is a
-- single operation, which is why `trips` and `participants` have no INSERT policy between them.
--
--   SP015  a trip needs a name
--   SP016  a trip cannot end before it starts

create function public.create_trip(
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
    v_trip public.trips;
begin
    if auth.uid() is null then
        raise exception 'Creating a trip needs a session' using errcode = '42501';
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

comment on function public.create_trip is
    'Creates a trip and its first admin together. The display name is asked for here because the
     creator becomes a participant, and a participant without a name is nobody on the list.';

-- What a trip list needs to show, in one read. SECURITY INVOKER so the policies on `trips` decide
-- which rows come back: a person sees the trips they take part in and no others.
create view public.trip_overview
with (security_invoker = true) as
select
    t.id,
    t.name,
    t.status,
    t.start_date,
    t.end_date,
    t.currency,
    t.closed_at,
    t.created_at,
    coalesce(spent.total_cents, 0) as total_cents,
    coalesce(spent.expenses, 0) as expense_count,
    coalesce(heads.participants, 0) as participant_count
from public.trips t
left join lateral (
    select sum(e.amount_cents)::bigint as total_cents, count(*)::bigint as expenses
    from public.expenses e where e.trip_id = t.id
) spent on true
left join lateral (
    select count(*)::bigint as participants
    from public.participants p where p.trip_id = t.id
) heads on true;

revoke execute on function public.create_trip(text, text, date, date) from public;
grant execute on function public.create_trip(text, text, date, date) to authenticated;
