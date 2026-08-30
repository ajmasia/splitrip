-- A balance is derived, never stored: a counter that gets updated can drift away from the rows it
-- claims to summarise. Contributions stay out of it — they add to what the trip cost but put
-- nobody in debt — and are reported in their own column.
--
-- SECURITY INVOKER is not a detail: a Postgres view runs with the permissions of its owner unless
-- it says otherwise, which here would hand every trip's money to anybody who queried it.

create view public.participant_balances
with (security_invoker = true) as
select
    p.trip_id,
    p.id as participant_id,
    coalesce(paid.total, 0) as paid_cents,
    coalesce(contributed.total, 0) as contributed_cents,
    coalesce(charged.total, 0) as charged_cents,
    coalesce(sent.total, 0) as settlements_paid_cents,
    coalesce(received.total, 0) as settlements_received_cents,
    coalesce(paid.total, 0) - coalesce(charged.total, 0)
        + coalesce(sent.total, 0) - coalesce(received.total, 0) as net_cents
from public.participants p
left join lateral (
    select sum(e.amount_cents)::bigint as total
    from public.expenses e
    where e.paid_by = p.id and e.type = 'shared'
) paid on true
left join lateral (
    select sum(e.amount_cents)::bigint as total
    from public.expenses e
    where e.paid_by = p.id and e.type = 'contribution'
) contributed on true
left join lateral (
    select sum(s.amount_cents)::bigint as total
    from public.expense_shares s
    where s.participant_id = p.id
) charged on true
left join lateral (
    select sum(pay.amount_cents)::bigint as total
    from public.payments pay
    where pay.from_participant_id = p.id and pay.voided_at is null
) sent on true
left join lateral (
    select sum(pay.amount_cents)::bigint as total
    from public.payments pay
    where pay.to_participant_id = p.id and pay.voided_at is null
) received on true;

comment on view public.participant_balances is
    'Per-participant balance, derived from the expenses, shares and payments that exist right now.
     The net figures of a trip sum to exactly zero.';
