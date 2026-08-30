-- Editing an expense is not editing a row: the shares have to be thrown away and computed again
-- from the new amount and the new split. So the direct policies go, and the functions become the
-- only way in. Two things are gained by that. An amount can no longer be changed while its shares
-- keep the old one, which is the one way the balances could lie. And a refusal now says so: an
-- UPDATE that RLS denies touches no row and stays silent, which the interface cannot report.

drop policy "Authors and admins edit an expense" on public.expenses;
drop policy "Authors and admins delete an expense" on public.expenses;

create function public.validated_split(p_trip_id uuid, p_participant_ids uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_split uuid[];
begin
    select array_agg(distinct s.participant_id) into v_split
    from unnest(p_participant_ids) as s(participant_id);

    if coalesce(cardinality(v_split), 0) = 0 then
        raise exception 'An expense must be split between at least one person'
            using errcode = 'SP005';
    end if;

    -- Aliased rather than bare: an unqualified `participant_id` here would resolve against
    -- `participants` and quietly compare a column with itself.
    if exists (
        select 1 from unnest(v_split) as s(participant_id)
        where not exists (
            select 1 from public.participants p
            where p.id = s.participant_id and p.trip_id = p_trip_id
        )
    ) then
        raise exception 'Everyone in the split must be a participant of the trip'
            using errcode = 'SP006';
    end if;

    return v_split;
end;
$$;

create function public.replace_expense_shares(
    p_expense_id uuid,
    p_amount_cents bigint,
    p_split uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_split_size int;
begin
    delete from public.expense_shares where expense_id = p_expense_id;

    if p_split is null then
        return;
    end if;

    v_split_size := cardinality(p_split);

    insert into public.expense_shares (expense_id, participant_id, expense_type, amount_cents)
    select
        p_expense_id,
        split.participant_id,
        'shared',
        p_amount_cents / v_split_size
            + case when split.position <= p_amount_cents % v_split_size then 1 else 0 end
    from (
        select participant_id, row_number() over (order by participant_id) as position
        from unnest(p_split) as s(participant_id)
    ) split;
end;
$$;

comment on function public.replace_expense_shares is
    'Writes the shares of an expense from scratch. It checks nothing: it is called only by the
     functions that have already established who the caller is, and is executable by nobody else.';

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

-- Every argument left out means "leave it as it is", so correcting an amount does not silently
-- reassign the payer or reset who the expense was split among.
create function public.update_expense(
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

create function public.delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_expense public.expenses;
    v_author public.participants;
begin
    select * into v_expense from public.expenses e where e.id = p_expense_id;
    if not found then
        raise exception 'No such expense' using errcode = '42501';
    end if;

    v_author := public.caller_participant(v_expense.trip_id);
    perform public.assert_trip_open(v_expense.trip_id);

    if v_author.id <> v_expense.created_by and v_author.role <> 'admin' then
        raise exception 'Only the author of an expense, or an admin, may delete it'
            using errcode = '42501';
    end if;

    delete from public.expenses where id = p_expense_id;
end;
$$;

revoke execute on function public.validated_split(uuid, uuid[]) from public;
revoke execute on function public.replace_expense_shares(uuid, bigint, uuid[]) from public;

revoke execute on function public.update_expense(uuid, text, bigint, text, uuid, date, uuid[], text) from public;
grant execute on function public.update_expense(uuid, text, bigint, text, uuid, date, uuid[], text) to authenticated;

revoke execute on function public.delete_expense(uuid) from public;
grant execute on function public.delete_expense(uuid) to authenticated;
