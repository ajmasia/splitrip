-- Withdrawing access, which is two operations with the same shape: a policy can refuse both, but a
-- refusal by policy touches no row and says nothing, and both of these have to be able to explain
-- themselves. So the policies go and functions take their place, as they did for expenses.
--
--   SP021  the participant has expenses attached to them
--   SP022  the participant has payments attached to them

drop policy "Admins revoke invitations of their trip" on public.invitations;
drop policy "Admins remove participants from their trip" on public.participants;

create function public.revoke_invitation(p_invitation_id uuid)
returns public.invitations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invitation public.invitations;
begin
    if auth.uid() is null then
        raise exception 'Revoking an invitation needs a session' using errcode = '42501';
    end if;

    select * into v_invitation from public.invitations i where i.id = p_invitation_id;
    if not found then
        raise exception 'That invitation is not valid' using errcode = 'SP010';
    end if;

    if not public.is_trip_admin(v_invitation.trip_id) then
        raise exception 'Revoking an invitation needs admin permissions' using errcode = 'SP018';
    end if;

    perform public.assert_trip_open(v_invitation.trip_id);

    -- Idempotent on purpose: two organisers tapping the same button is not an error, and the first
    -- revocation is the one that counts. Whoever joined through it before keeps their place — this
    -- touches the invitation and nothing else.
    update public.invitations
       set revoked_at = coalesce(revoked_at, now())
     where id = p_invitation_id
    returning * into v_invitation;

    return v_invitation;
end;
$$;

comment on function public.revoke_invitation is
    'Stops an invitation letting anybody else in. The participants who already joined through it are
     untouched: they are on the trip now, not because of a link.';

create function public.remove_participant(p_participant_id uuid)
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

    delete from public.participants where id = p_participant_id;
end;
$$;

comment on function public.remove_participant is
    'Takes somebody off a trip they have no money on. Their credential stops reaching the trip the
     moment the row is gone, because every policy asks the participants table who belongs.';

revoke execute on function public.revoke_invitation(uuid) from public;
revoke execute on function public.remove_participant(uuid) from public;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.remove_participant(uuid) to authenticated;
