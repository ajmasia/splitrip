-- Two halves of the expense form belong to whoever organises the trip: saying that somebody else
-- paid, and marking an expense as one nobody shares. Both are claims about other people's money,
-- and a claim anybody can make is not a rule. So they are refused here rather than hidden in the
-- interface, where hiding a control only means it cannot be clicked.
--
-- Choosing who a shared expense is split among stays with everybody. Whoever paid for a dinner
-- three of them had is the person who knows who was there, and having to ask an organiser to record
-- it is exactly the friction this application exists to remove.
--
--   SP024  only an organiser records what somebody else paid
--   SP025  only an organiser records something nobody shares

create function public.assert_role_may_set(
    p_author public.participants,
    p_paid_by uuid,
    p_type text
)
returns void
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
    if p_author.role = 'admin' then
        return;
    end if;

    -- What is being asked for, not what the expense ends up with: an organiser may have attributed
    -- somebody's expense elsewhere, and that must not lock its author out of fixing a typo in it.
    if p_paid_by is not null and p_paid_by <> p_author.id then
        raise exception 'Only an organiser records what somebody else paid' using errcode = 'SP024';
    end if;

    if p_type is not null and p_type <> 'shared' then
        raise exception 'Only an organiser records something nobody shares' using errcode = 'SP025';
    end if;
end;
$$;

create or replace function public.create_expense(
    p_trip_id uuid,
    p_description text,
    p_amount_cents bigint,
    p_type text default 'shared',
    p_paid_by uuid default null,
    p_spent_on date default null,
    p_split_participant_ids uuid[] default null,
    p_currency text default 'EUR'
)
returns public.expenses
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_author public.participants;
    v_payer_id uuid;
    v_split uuid[];
    v_expense public.expenses;
begin
    v_author := public.caller_participant(p_trip_id);
    perform public.assert_trip_open(p_trip_id);
    perform public.assert_role_may_set(v_author, p_paid_by, p_type);

    if p_amount_cents is null or p_amount_cents <= 0 then
        raise exception 'The amount must be greater than zero' using errcode = 'SP002';
    end if;

    if p_currency is distinct from 'EUR' then
        raise exception 'This release operates in euros only' using errcode = 'SP003';
    end if;

    v_payer_id := coalesce(p_paid_by, v_author.id);
    if not exists (
        select 1 from public.participants p where p.id = v_payer_id and p.trip_id = p_trip_id
    ) then
        raise exception 'The payer must be a participant of the trip' using errcode = 'SP007';
    end if;

    if p_type = 'contribution' then
        if p_split_participant_ids is not null then
            raise exception 'A contribution is not split' using errcode = 'SP004';
        end if;
    elsif p_split_participant_ids is null then
        select array_agg(p.id) into v_split
        from public.participants p where p.trip_id = p_trip_id;
    else
        v_split := public.validated_split(p_trip_id, p_split_participant_ids);
    end if;

    insert into public.expenses (
        trip_id, type, description, amount_cents, currency, spent_on, paid_by, created_by
    )
    values (
        p_trip_id, p_type, btrim(p_description), p_amount_cents, p_currency,
        coalesce(p_spent_on, current_date), v_payer_id, v_author.id
    )
    returning * into v_expense;

    perform public.replace_expense_shares(v_expense.id, v_expense.amount_cents, v_split);

    return v_expense;
end;
$$;

create or replace function public.update_expense(
    p_expense_id uuid,
    p_description text default null,
    p_amount_cents bigint default null,
    p_type text default null,
    p_paid_by uuid default null,
    p_spent_on date default null,
    p_split_participant_ids uuid[] default null,
    p_currency text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_expense public.expenses;
    v_author public.participants;
    v_type text;
    v_amount_cents bigint;
    v_currency text;
    v_payer_id uuid;
    v_split uuid[];
begin
    select * into v_expense from public.expenses e where e.id = p_expense_id;
    if not found then
        raise exception 'No such expense' using errcode = '42501';
    end if;

    v_author := public.caller_participant(v_expense.trip_id);
    perform public.assert_trip_open(v_expense.trip_id);

    if v_author.id <> v_expense.created_by and v_author.role <> 'admin' then
        raise exception 'Only the author of an expense, or an admin, may change it'
            using errcode = '42501';
    end if;

    -- The same limit as on the way in, or the rule would be one edit away from being nothing.
    perform public.assert_role_may_set(v_author, p_paid_by, p_type);

    v_amount_cents := coalesce(p_amount_cents, v_expense.amount_cents);
    if v_amount_cents <= 0 then
        raise exception 'The amount must be greater than zero' using errcode = 'SP002';
    end if;

    v_currency := coalesce(p_currency, v_expense.currency);
    if v_currency is distinct from 'EUR' then
        raise exception 'This release operates in euros only' using errcode = 'SP003';
    end if;

    v_payer_id := coalesce(p_paid_by, v_expense.paid_by);
    if not exists (
        select 1 from public.participants p
        where p.id = v_payer_id and p.trip_id = v_expense.trip_id
    ) then
        raise exception 'The payer must be a participant of the trip' using errcode = 'SP007';
    end if;

    v_type := coalesce(p_type, v_expense.type);

    if v_type = 'contribution' then
        if p_split_participant_ids is not null then
            raise exception 'A contribution is not split' using errcode = 'SP004';
        end if;
    elsif p_split_participant_ids is not null then
        v_split := public.validated_split(v_expense.trip_id, p_split_participant_ids);
    else
        select array_agg(s.participant_id) into v_split
        from public.expense_shares s where s.expense_id = p_expense_id;

        -- Nothing to keep when a contribution becomes shared: fall back to the whole trip.
        if v_split is null then
            select array_agg(p.id) into v_split
            from public.participants p where p.trip_id = v_expense.trip_id;
        end if;
    end if;

    -- Before the update, not after: the shares mirror the expense type through a cascading foreign
    -- key, so turning a shared expense into a contribution would drag them along and break.
    delete from public.expense_shares where expense_id = p_expense_id;

    update public.expenses
       set type = v_type,
           description = coalesce(btrim(p_description), description),
           amount_cents = v_amount_cents,
           currency = v_currency,
           spent_on = coalesce(p_spent_on, spent_on),
           paid_by = v_payer_id
     where id = p_expense_id
    returning * into v_expense;

    perform public.replace_expense_shares(v_expense.id, v_expense.amount_cents, v_split);

    return v_expense;
end;
$$;

revoke execute on function public.assert_role_may_set(public.participants, uuid, text) from public;
