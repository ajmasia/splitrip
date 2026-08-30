-- An expense and its shares are one operation or none: recording the expense and then failing to
-- split it would leave money charged to nobody. No table has an INSERT policy, so this is the only
-- door in, and it is SECURITY DEFINER — which means membership has to be checked here, explicitly,
-- since RLS is not doing it for us.
--
-- Rejections carry their own SQLSTATE so the bilingual interface can map a rule to its copy without
-- parsing English text:
--
--   42501  the caller has no standing to do this
--   SP001  the trip is closed
--   SP002  the amount is not a positive number of cents
--   SP003  the currency is not supported in this release
--   SP004  a contribution is not split
--   SP005  a shared expense needs at least one person in its split
--   SP006  the split reaches somebody outside the trip
--   SP007  the payer is not a participant of the trip

create function public.caller_participant(p_trip_id uuid)
returns public.participants
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_participant public.participants;
begin
    select * into v_participant
    from public.participants p
    where p.trip_id = p_trip_id and p.user_id = auth.uid();

    if not found then
        raise exception 'Not a participant of this trip' using errcode = '42501';
    end if;

    return v_participant;
end;
$$;

create function public.assert_trip_open(p_trip_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_trip_open(p_trip_id) then
        raise exception 'The trip is closed' using errcode = 'SP001';
    end if;
end;
$$;

create function public.create_expense(
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
    v_split_size int;
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
        select array_agg(distinct s.participant_id) into v_split
        from unnest(p_split_participant_ids) as s(participant_id);

        if coalesce(cardinality(v_split), 0) = 0 then
            raise exception 'An expense must be split between at least one person'
                using errcode = 'SP005';
        end if;

        -- Aliased rather than bare: an unqualified `id` here would resolve against
        -- `participants` and quietly compare the column with itself.
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
    end if;

    insert into public.expenses (
        trip_id, type, description, amount_cents, currency, spent_on, paid_by, created_by
    )
    values (
        p_trip_id, p_type, btrim(p_description), p_amount_cents, p_currency,
        coalesce(p_spent_on, current_date), v_payer_id, v_author.id
    )
    returning * into v_expense;

    if v_split is not null then
        v_split_size := cardinality(v_split);

        insert into public.expense_shares (expense_id, participant_id, expense_type, amount_cents)
        select
            v_expense.id,
            s.participant_id,
            'shared',
            v_expense.amount_cents / v_split_size
                + case when s.position <= v_expense.amount_cents % v_split_size then 1 else 0 end
        from (
            select participant_id, row_number() over (order by participant_id) as position
            from unnest(v_split) as split(participant_id)
        ) s;
    end if;

    return v_expense;
end;
$$;

comment on function public.create_expense is
    'Records an expense with its shares in one transaction. The leftover cents of a split that does
     not divide exactly go one by one to the first participants by identifier, which is what makes
     the same expense charge the same people the same cents every time it is computed.';

revoke execute on function public.create_expense(uuid, text, bigint, text, uuid, date, uuid[], text) from public;
grant execute on function public.create_expense(uuid, text, bigint, text, uuid, date, uuid[], text) to authenticated;
