-- What each participant put in, what they were charged, and where that leaves them.
--
-- A balance is derived, never stored. A counter that gets updated on every write is a counter that
-- can drift away from the rows it claims to summarise; a view is the sum of what is actually there,
-- so it cannot be wrong about it.
--
-- The net figure reads: what I paid, minus what the splits charged me, plus what I have handed over
-- in settlements, minus what I have collected. Positive means the group owes me. Every shared
-- expense is charged in full to somebody, and every payment is both sent and received, so the net
-- figures of a trip always sum to exactly zero.
--
-- Contributions are counted apart. They add to what the trip cost but create no debt for anyone,
-- their payer included, so they stay out of the balance and are reported in their own column.
--
-- SECURITY INVOKER is not a detail: a Postgres view runs with the permissions of its owner unless
-- it says otherwise, which would let anybody read every trip's money through it. Declared this way
-- the view sees exactly what the person querying it is allowed to see.

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
