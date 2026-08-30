-- The trip screen opens with what the trip has cost, and one number was not enough to say it: the
-- total mixes money that gets divided with money somebody gave the group, and those two behave
-- differently. Splitting the sum in the view is what lets the screen show the three figures — spent,
-- per person, not split — without reading the expenses a second time to work out which is which.
--
-- The average per person is left to the reader of this view rather than computed here: it is
-- shared_cents over participant_count, and a view that divided would have to decide what to do
-- about a trip with nobody in it.

create or replace view public.trip_overview
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
    coalesce(heads.participants, 0) as participant_count,
    coalesce(spent.shared_cents, 0) as shared_cents,
    coalesce(spent.contributed_cents, 0) as contributed_cents
from public.trips t
left join lateral (
    select
        sum(e.amount_cents)::bigint as total_cents,
        count(*)::bigint as expenses,
        sum(e.amount_cents) filter (where e.type = 'shared')::bigint as shared_cents,
        sum(e.amount_cents) filter (where e.type = 'contribution')::bigint as contributed_cents
    from public.expenses e where e.trip_id = t.id
) spent on true
left join lateral (
    select count(*)::bigint as participants
    from public.participants p where p.trip_id = t.id
) heads on true;

comment on column public.trip_overview.shared_cents is
    'The part of the total that is divided among people. What the average cost per person is
     computed from: a contribution charges nobody, so counting it there would report a cost that
     nobody is going to pay.';
