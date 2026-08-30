-- A payment is history. The direct policy let its author rewrite the amount instead of voiding it,
-- which is the one thing the trip must never lose, so it goes the way the expense policies went:
-- money moves through functions that check who is asking and say why when they refuse.
--
--   SP008  a payment cannot be made to oneself
--   SP009  the payment is already voided
--
-- and SP007, which named the payer of an expense, now covers anybody named in an operation who
-- does not belong to the trip.

drop policy "Authors and admins void a payment" on public.payments;

create function public.record_payment(
    p_trip_id uuid,
    p_from_participant_id uuid,
    p_to_participant_id uuid,
    p_amount_cents bigint,
    p_paid_on date default null,
    p_currency text default 'EUR'
)
returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_author public.participants;
    v_payment public.payments;
begin
    v_author := public.caller_participant(p_trip_id);
    perform public.assert_trip_open(p_trip_id);

    if p_amount_cents is null or p_amount_cents <= 0 then
        raise exception 'The amount must be greater than zero' using errcode = 'SP002';
    end if;

    if p_currency is distinct from 'EUR' then
        raise exception 'This release operates in euros only' using errcode = 'SP003';
    end if;

    if p_from_participant_id = p_to_participant_id then
        raise exception 'A payment cannot be made to oneself' using errcode = 'SP008';
    end if;

    if (select count(*) from public.participants p
        where p.trip_id = p_trip_id
          and p.id in (p_from_participant_id, p_to_participant_id)) <> 2 then
        raise exception 'Both parties must be participants of the trip' using errcode = 'SP007';
    end if;

    insert into public.payments (
        trip_id, from_participant_id, to_participant_id, amount_cents, currency, paid_on, created_by
    )
    values (
        p_trip_id, p_from_participant_id, p_to_participant_id, p_amount_cents, p_currency,
        coalesce(p_paid_on, current_date), v_author.id
    )
    returning * into v_payment;

    return v_payment;
end;
$$;

comment on function public.record_payment is
    'Records money handed from one participant to another to settle up. Partial payments are
     ordinary payments: nothing here knows what anybody owes, and the balances absorb whatever
     amount is recorded.';

create function public.void_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_payment public.payments;
    v_author public.participants;
begin
    select * into v_payment from public.payments p where p.id = p_payment_id;
    if not found then
        raise exception 'No such payment' using errcode = '42501';
    end if;

    v_author := public.caller_participant(v_payment.trip_id);
    perform public.assert_trip_open(v_payment.trip_id);

    if v_author.id <> v_payment.created_by and v_author.role <> 'admin' then
        raise exception 'Only whoever recorded a payment, or an admin, may void it'
            using errcode = '42501';
    end if;

    if v_payment.voided_at is not null then
        raise exception 'That payment is already voided' using errcode = 'SP009';
    end if;

    update public.payments set voided_at = now()
     where id = p_payment_id
    returning * into v_payment;

    return v_payment;
end;
$$;

revoke execute on function public.record_payment(uuid, uuid, uuid, bigint, date, text) from public;
grant execute on function public.record_payment(uuid, uuid, uuid, bigint, date, text) to authenticated;

revoke execute on function public.void_payment(uuid) from public;
grant execute on function public.void_payment(uuid) to authenticated;
