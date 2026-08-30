-- What a list of expenses has to show, in one read: the payer's name rather than their id, and how
-- many people the expense is split among. SECURITY INVOKER, so the policies on `expenses` and
-- `participants` decide which rows come back and the view adds no reach of its own.

create view public.expense_overview
with (security_invoker = true) as
select
    e.id,
    e.trip_id,
    e.type,
    e.description,
    e.amount_cents,
    e.currency,
    e.spent_on,
    e.created_at,
    e.paid_by,
    payer.display_name as paid_by_name,
    e.created_by,
    coalesce(split.people, 0) as split_count
from public.expenses e
join public.participants payer on payer.id = e.paid_by
left join lateral (
    select count(*)::bigint as people
    from public.expense_shares s
    where s.expense_id = e.id
) split on true;

comment on view public.expense_overview is
    'A contribution is split among nobody, so its split_count is 0 rather than null: a list column
     that is sometimes a number and sometimes absent has to be handled twice everywhere it is read.';
