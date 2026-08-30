-- "That person has 1 expense to their name" was told to somebody who has no expense to their name:
-- being in the split of one counted the same as having paid for it. So the organiser goes looking
-- for an expense that is not there, and a refusal they could have acted on reads like a bug.
--
-- They remain two reasons not to remove somebody — a share belonging to nobody is a balance that no
-- longer adds up — but they are two different sentences, and only one of them leaves the reader
-- something to do about it.
--
--   SP028  the person is in the split of expenses, without any of their own
--
-- Everything else is exactly as `role_management` left it, which is the version this replaces.

create or replace function public.remove_participant(p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_participant public.participants;
    v_expenses bigint;
    v_shares bigint;
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

    -- Money is the reason this refuses rather than cascades. An expense whose payer has vanished is
    -- a balance that no longer adds up, and there is no undo for that. Whoever recorded an entry
    -- counts as attached to it too: the row points at them, and leaving them out here would swap a
    -- sentence somebody can read for a foreign key violation they cannot.
    select count(*) into v_expenses
      from public.expenses e
     where e.paid_by = p_participant_id
        or e.created_by = p_participant_id;

    if v_expenses > 0 then
        raise exception 'That person has expenses of their own on this trip'
            using errcode = 'SP021', detail = v_expenses::text;
    end if;

    -- Being in a split is the ordinary case, and the one with a way out: take them out of those
    -- splits and they can go. Saying which of the two it is turns a wall into an instruction.
    select count(*) into v_shares
      from public.expense_shares s
     where s.participant_id = p_participant_id;

    if v_shares > 0 then
        raise exception 'That person is in the split of expenses on this trip'
            using errcode = 'SP028', detail = v_shares::text;
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
