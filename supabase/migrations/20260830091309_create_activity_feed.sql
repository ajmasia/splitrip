-- The feed is written by triggers, not by application code: an audit trail that depends on every
-- function remembering to write it ends up with gaps.
--
-- The author is `auth.uid()` resolved to their participant, so correcting somebody else's expense
-- is attributed to whoever corrected it, falling back to the row's own author when there is no
-- session to attribute it to.

create table public.activity (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    action text not null,
    actor_participant_id uuid references public.participants (id) on delete set null,
    actor_name text,
    subject_id uuid,
    details jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default clock_timestamp(),
    constraint activity_action_known check (
        action in (
            'expense.created', 'expense.updated', 'expense.deleted',
            'payment.recorded', 'payment.voided',
            'participant.joined', 'participant.left',
            'trip.closed', 'trip.reopened'
        )
    )
);

comment on column public.activity.occurred_at is
    'clock_timestamp(), not now(): several entries can be written by one transaction, and a
     chronological feed must not leave their order to chance by giving them the same instant.';

comment on column public.activity.actor_name is
    'The author name as it stood when the action happened, so the entry survives their departure.';

comment on column public.activity.subject_id is
    'The expense, payment or participant the entry is about. Not a foreign key: the entry outlives
     what it describes, which is the whole point of keeping a trace.';

create index activity_trip_id_occurred_at_idx on public.activity (trip_id, occurred_at desc);

-- Resolves the current session to its participant in the trip, falling back to the row's own
-- author when there is no session to attribute the action to.
create function public.activity_actor(p_trip_id uuid, p_fallback_participant_id uuid)
returns public.participants
language sql
stable
as $$
    select p.*
    from public.participants p
    where p.id = coalesce(
        (select a.id from public.participants a
          where a.trip_id = p_trip_id and a.user_id = auth.uid()),
        p_fallback_participant_id
    );
$$;

create function public.log_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_expense public.expenses := coalesce(new, old);
    v_actor public.participants;
begin
    -- A cascade from the trip being deleted takes the whole feed with it; there is nothing to log.
    if tg_op = 'DELETE' and not exists (select 1 from public.trips t where t.id = old.trip_id) then
        return null;
    end if;

    v_actor := public.activity_actor(v_expense.trip_id, v_expense.created_by);

    insert into public.activity (trip_id, action, actor_participant_id, actor_name, subject_id, details)
    values (
        v_expense.trip_id,
        case tg_op when 'INSERT' then 'expense.created'
                   when 'UPDATE' then 'expense.updated'
                   else 'expense.deleted' end,
        v_actor.id,
        v_actor.display_name,
        v_expense.id,
        jsonb_build_object(
            'description', v_expense.description,
            'amount_cents', v_expense.amount_cents,
            'type', v_expense.type
        )
    );
    return null;
end;
$$;

create trigger expenses_log_activity
    after insert or update or delete on public.expenses
    for each row execute function public.log_expense_activity();

create function public.log_payment_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_payment public.payments := coalesce(new, old);
    v_actor public.participants;
    v_action text;
begin
    if tg_op = 'INSERT' then
        v_action := 'payment.recorded';
    elsif old.voided_at is null and new.voided_at is not null then
        v_action := 'payment.voided';
    else
        -- Nothing else about a payment is worth an entry: it is recorded or it is voided.
        return null;
    end if;

    v_actor := public.activity_actor(v_payment.trip_id, v_payment.created_by);

    insert into public.activity (trip_id, action, actor_participant_id, actor_name, subject_id, details)
    values (
        v_payment.trip_id, v_action, v_actor.id, v_actor.display_name, v_payment.id,
        jsonb_build_object(
            'amount_cents', v_payment.amount_cents,
            'from_participant_id', v_payment.from_participant_id,
            'to_participant_id', v_payment.to_participant_id
        )
    );
    return null;
end;
$$;

create trigger payments_log_activity
    after insert or update on public.payments
    for each row execute function public.log_payment_activity();

create function public.log_participant_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_participant public.participants := coalesce(new, old);
    v_actor public.participants;
begin
    if tg_op = 'DELETE' and not exists (select 1 from public.trips t where t.id = old.trip_id) then
        return null;
    end if;

    -- Joining is done by the person themselves; removing is done by an admin.
    v_actor := public.activity_actor(v_participant.trip_id, v_participant.id);

    insert into public.activity (trip_id, action, actor_participant_id, actor_name, subject_id, details)
    values (
        v_participant.trip_id,
        case tg_op when 'INSERT' then 'participant.joined' else 'participant.left' end,
        v_actor.id,
        v_actor.display_name,
        v_participant.id,
        jsonb_build_object(
            'display_name', v_participant.display_name,
            'role', v_participant.role
        )
    );
    return null;
end;
$$;

create trigger participants_log_activity
    after insert or delete on public.participants
    for each row execute function public.log_participant_activity();

create function public.log_trip_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_actor public.participants;
begin
    v_actor := public.activity_actor(new.id, null);

    insert into public.activity (trip_id, action, actor_participant_id, actor_name, subject_id, details)
    values (
        new.id,
        case new.status when 'closed' then 'trip.closed' else 'trip.reopened' end,
        v_actor.id,
        v_actor.display_name,
        new.id,
        jsonb_build_object('name', new.name)
    );
    return null;
end;
$$;

create trigger trips_log_activity
    after update of status on public.trips
    for each row when (old.status is distinct from new.status)
    execute function public.log_trip_activity();
