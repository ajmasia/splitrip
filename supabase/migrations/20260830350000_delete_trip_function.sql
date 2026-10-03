-- An organiser can delete a trip for good: one created by mistake, one opened to try the
-- application, one whose accounts were settled long ago. Nothing brings it back, so the organiser
-- confirms by typing its name, and the name is checked here rather than only in the form — a stale
-- form or a hand-made request must not be able to delete without it.
--
--   SP030  the name typed to confirm is not the trip's
--
-- Deleting the row is the whole of the data work. Every table hangs from `trips` with a cascade,
-- the references to participants are deferrable so the cascade can run in any order once they are
-- deferred, the activity triggers log nothing for a trip that is going, and the frozen summary is
-- a column of the row.

create function public.delete_trip(p_trip_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text;
begin
    perform public.caller_participant(p_trip_id);

    if not public.is_trip_admin(p_trip_id) then
        raise exception 'Deleting a trip is an organiser''s job' using errcode = '42501';
    end if;

    select name into v_name from public.trips where id = p_trip_id;

    -- Surrounding whitespace and letter case do not count, the same comparison the form makes, so
    -- the form never offers what this would refuse.
    if lower(regexp_replace(coalesce(p_confirm_name, ''), '^\s+|\s+$', '', 'g'))
       <> lower(regexp_replace(v_name, '^\s+|\s+$', '', 'g')) then
        raise exception 'The name typed is not the trip''s' using errcode = 'SP030';
    end if;

    -- The references to participants are deferrable but start out immediate, which is what refuses
    -- to remove somebody who still carries money. A whole trip going is the case they were made
    -- deferrable for: the cascade may reach the participants before the shares and payments that
    -- point at them, and by the end of the transaction none of either is left. Deferred by name, and
    -- only for this transaction, so nothing else loses the check.
    set constraints
        public.expenses_payer_in_trip,
        public.expenses_author_in_trip,
        public.expense_shares_participant_fkey,
        public.payments_payer_in_trip,
        public.payments_payee_in_trip,
        public.payments_author_in_trip
        deferred;

    delete from public.trips where id = p_trip_id;
end;
$$;

revoke execute on function public.delete_trip(uuid, text) from public;
revoke execute on function public.delete_trip(uuid, text) from anon;
grant execute on function public.delete_trip(uuid, text) to authenticated;
