-- Roles change through a function for the same reason everything else does: a policy that refuses
-- says nothing, and this one has a refusal worth reading. It also has an invariant to keep, and an
-- invariant enforced in one function is an invariant, while the same rule written into a policy and
-- into the interface is two copies waiting to disagree.
--
--   SP023  the trip would be left with nobody organising it

drop policy "Admins change roles on their trip" on public.participants;

create function public.set_participant_role(p_participant_id uuid, p_role text)
returns public.participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_participant public.participants;
begin
    if auth.uid() is null then
        raise exception 'Changing a role needs a session' using errcode = '42501';
    end if;

    select * into v_participant from public.participants p where p.id = p_participant_id;
    if not found then
        raise exception 'That person is not on the trip' using errcode = 'SP007';
    end if;

    if not public.is_trip_admin(v_participant.trip_id) then
        raise exception 'Changing a role needs admin permissions' using errcode = 'SP018';
    end if;

    perform public.assert_trip_open(v_participant.trip_id);

    if p_role not in ('admin', 'participant') then
        raise exception 'A participant is either an admin or a participant' using errcode = 'SP019';
    end if;

    if v_participant.role = p_role then
        return v_participant;
    end if;

    if p_role = 'participant' then
        perform public.assert_another_admin_remains(v_participant);
    end if;

    update public.participants set role = p_role
     where id = p_participant_id
    returning * into v_participant;

    return v_participant;
end;
$$;

-- The rule the spec states as "at all times", which is why it is a function of its own rather than
-- a condition written out twice: stepping down and being taken off are two ways to the same empty
-- chair.
create function public.assert_another_admin_remains(p_participant public.participants)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if p_participant.role <> 'admin' then
        return;
    end if;

    if not exists (
        select 1 from public.participants p
         where p.trip_id = p_participant.trip_id
           and p.role = 'admin'
           and p.id <> p_participant.id
    ) then
        raise exception 'A trip has to keep somebody organising it' using errcode = 'SP023';
    end if;
end;
$$;

create or replace function public.remove_participant(p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_participant public.participants;
    v_expenses bigint;
    v_payments bigint;
begin
    if auth.uid() is null then
        raise exception 'Removing somebody needs a session' using errcode = '42501';
    end if;

    select * into v_participant from public.participants p where p.id = p_participant_id;
    if not found then
        raise exception 'That person is not on the trip' using errcode = 'SP007';
    end if;

    if not public.is_trip_admin(v_participant.trip_id) then
        raise exception 'Removing somebody needs admin permissions' using errcode = 'SP018';
    end if;

    perform public.assert_trip_open(v_participant.trip_id);

    -- Money is the reason this refuses rather than cascades. An expense whose payer has vanished, or
    -- a share belonging to nobody, is a balance that no longer adds up, and there is no undo for
    -- that. The count travels in DETAIL so the interface can say how much is in the way.
    --
    -- Whoever recorded an entry counts as attached to it too. Not because they owe anything, but
    -- because the row points at them: leaving them out here would swap a sentence somebody can read
    -- for a foreign key violation they cannot.
    select count(*) into v_expenses
      from public.expenses e
     where e.paid_by = p_participant_id
        or e.created_by = p_participant_id
        or exists (
            select 1 from public.expense_shares s
             where s.expense_id = e.id and s.participant_id = p_participant_id
        );

    if v_expenses > 0 then
        raise exception 'That person has expenses on this trip'
            using errcode = 'SP021', detail = v_expenses::text;
    end if;

    select count(*) into v_payments
      from public.payments p
     where p.from_participant_id = p_participant_id
        or p.to_participant_id = p_participant_id
        or p.created_by = p_participant_id;

    if v_payments > 0 then
        raise exception 'That person has payments on this trip'
            using errcode = 'SP022', detail = v_payments::text;
    end if;

    -- Money first, because that refusal is final: no promotion makes it possible. This one only
    -- asks for somebody else to be given the keys first.
    perform public.assert_another_admin_remains(v_participant);

    delete from public.participants where id = p_participant_id;
end;
$$;

revoke execute on function public.set_participant_role(uuid, text) from public;
revoke execute on function public.assert_another_admin_remains(public.participants) from public;
grant execute on function public.set_participant_role(uuid, text) to authenticated;
