-- Closing freezes the trip into a snapshot, because a summary recomputed on every read would move
-- the moment somebody corrected an old expense, and the spec asks for figures that stay put.
--
-- The snapshot holds the money: totals, what each participant paid and was charged, their net
-- balance, the contributions nobody was asked to share, and the payments already made. It does not
-- hold the outstanding transfers, and deliberately: turning balances into transfers is one greedy
-- algorithm that already lives in TypeScript, and a second copy in PL/pgSQL would be two versions
-- of one rule waiting to disagree. Derived from frozen balances, the transfers are just as frozen.
--
--   SP014  the trip is already in the state it is being moved to
--
-- The status is also pinned by a constraint rather than by trust: a summary exists exactly when the
-- trip is closed, so a trip cannot be closed by hand and left without one.

alter table public.trips drop constraint trips_summary_requires_closed;

alter table public.trips add constraint trips_summary_matches_status
    check ((summary is not null) = (status = 'closed'));

create function public.trip_summary(p_trip_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    with totals as (
        select
            count(*) as expense_count,
            coalesce(sum(amount_cents), 0)::bigint as total_cents,
            coalesce(sum(amount_cents) filter (where type = 'shared'), 0)::bigint as shared_cents,
            coalesce(sum(amount_cents) filter (where type = 'contribution'), 0)::bigint
                as contributions_cents
        from public.expenses where trip_id = p_trip_id
    ),
    heads as (
        select count(*) as participant_count
        from public.participants where trip_id = p_trip_id
    ),
    people as (
        select jsonb_agg(jsonb_build_object(
                   'participant_id', p.id,
                   'display_name', p.display_name,
                   'role', p.role,
                   'paid_cents', b.paid_cents,
                   'contributed_cents', b.contributed_cents,
                   'charged_cents', b.charged_cents,
                   'settlements_paid_cents', b.settlements_paid_cents,
                   'settlements_received_cents', b.settlements_received_cents,
                   'net_cents', b.net_cents
               ) order by p.display_name) as rows
        from public.participants p
        join public.participant_balances b on b.participant_id = p.id
        where p.trip_id = p_trip_id
    ),
    given as (
        select jsonb_agg(jsonb_build_object(
                   'expense_id', e.id,
                   'description', e.description,
                   'amount_cents', e.amount_cents,
                   'spent_on', e.spent_on,
                   'paid_by', e.paid_by,
                   'payer_name', p.display_name
               ) order by e.spent_on, e.id) as rows
        from public.expenses e
        join public.participants p on p.id = e.paid_by
        where e.trip_id = p_trip_id and e.type = 'contribution'
    ),
    handed_over as (
        select jsonb_agg(jsonb_build_object(
                   'payment_id', pay.id,
                   'from_participant_id', pay.from_participant_id,
                   'from_name', f.display_name,
                   'to_participant_id', pay.to_participant_id,
                   'to_name', t.display_name,
                   'amount_cents', pay.amount_cents,
                   'paid_on', pay.paid_on,
                   'voided', pay.voided_at is not null
               ) order by pay.paid_on, pay.id) as rows
        from public.payments pay
        join public.participants f on f.id = pay.from_participant_id
        join public.participants t on t.id = pay.to_participant_id
        where pay.trip_id = p_trip_id
    )
    select jsonb_build_object(
        'trip_id', tr.id,
        'name', tr.name,
        'currency', tr.currency,
        'start_date', tr.start_date,
        'end_date', tr.end_date,
        'participant_count', heads.participant_count,
        'expense_count', totals.expense_count,
        'total_cents', totals.total_cents,
        'shared_cents', totals.shared_cents,
        'contributions_cents', totals.contributions_cents,
        'cost_per_person_cents',
            case when heads.participant_count = 0 then 0
                 else totals.shared_cents / heads.participant_count end,
        'participants', coalesce(people.rows, '[]'::jsonb),
        'contributions', coalesce(given.rows, '[]'::jsonb),
        'payments', coalesce(handed_over.rows, '[]'::jsonb)
    )
    from public.trips tr, totals, heads, people, given, handed_over
    where tr.id = p_trip_id;
$$;

comment on function public.trip_summary is
    'The figures a trip is frozen into when it closes. Cost per person divides the shared spending
     only: a contribution adds to what the trip cost but was never anybody else''s to pay.';

create function public.close_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_trip public.trips;
begin
    perform public.caller_participant(p_trip_id);

    if not public.is_trip_admin(p_trip_id) then
        raise exception 'Closing a trip is an organiser''s job' using errcode = '42501';
    end if;

    if not public.is_trip_open(p_trip_id) then
        raise exception 'The trip is already closed' using errcode = 'SP014';
    end if;

    update public.trips
       set status = 'closed', closed_at = now(), summary = public.trip_summary(p_trip_id)
     where id = p_trip_id
    returning * into v_trip;

    return v_trip;
end;
$$;

create function public.reopen_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_trip public.trips;
begin
    perform public.caller_participant(p_trip_id);

    if not public.is_trip_admin(p_trip_id) then
        raise exception 'Reopening a trip is an organiser''s job' using errcode = '42501';
    end if;

    if public.is_trip_open(p_trip_id) then
        raise exception 'The trip is already open' using errcode = 'SP014';
    end if;

    -- The summary goes with it. A trip taking changes again has no frozen figures to show, and the
    -- next close writes them afresh.
    update public.trips set status = 'open', closed_at = null, summary = null
     where id = p_trip_id
    returning * into v_trip;

    return v_trip;
end;
$$;

revoke execute on function public.trip_summary(uuid) from public;

revoke execute on function public.close_trip(uuid) from public;
grant execute on function public.close_trip(uuid) to authenticated;

revoke execute on function public.reopen_trip(uuid) from public;
grant execute on function public.reopen_trip(uuid) to authenticated;
