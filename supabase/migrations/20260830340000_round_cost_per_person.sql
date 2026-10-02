-- The closing summary divided the shared spending by the number of heads with integer division,
-- which truncates. The trip screen and the organiser dashboard round to the nearest cent, so a trip
-- whose shared spending did not divide evenly read one cent cheaper the moment it was closed:
-- €20.00 among three was €6.67 while open and €6.66 once frozen. The summary now rounds the same
-- way, half away from zero, which for an amount that is never negative is the same as half up.
--
-- Only the definition changes. A summary frozen before this migration keeps the figure it was
-- frozen with, as a closed trip's summary must; reopening and closing it again recomputes it.

create or replace function public.trip_summary(p_trip_id uuid)
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
                 else round(totals.shared_cents::numeric / heads.participant_count)::bigint end,
        'participants', coalesce(people.rows, '[]'::jsonb),
        'contributions', coalesce(given.rows, '[]'::jsonb),
        'payments', coalesce(handed_over.rows, '[]'::jsonb)
    )
    from public.trips tr, totals, heads, people, given, handed_over
    where tr.id = p_trip_id;
$$;
