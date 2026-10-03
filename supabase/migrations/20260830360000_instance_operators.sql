-- Who runs this instance. Being an operator is a power over the application, not over any trip:
-- it grants no access to trips, and organising a trip does not make anybody one. What operators
-- get is what the application tells whoever runs it — the feedback its users send, to begin with.
--
-- Listed by email, like `trip_creators` and for the same reason: somebody can be made an operator
-- before their account exists. The two lists are kept apart because opening trips and running the
-- instance are different powers that will not always go to the same people.

create table public.instance_operators (
    email text primary key,
    note text,
    added_at timestamptz not null default now(),
    constraint instance_operators_email_lowercase check (email = lower(btrim(email)))
);

comment on table public.instance_operators is
    'Who operates this instance. Listed by email rather than by user id so somebody can be made an
     operator before their account exists.';

alter table public.instance_operators enable row level security;

-- No policy, deliberately: nobody reads the list through the application. The only thing that
-- looks at it is the function below, and whoever runs the instance edits it in the database.

-- Whether the caller is an operator: signed in to an account, not holding only a device identity,
-- whose address is on the list. Policies and the application ask this rather than the table.
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select auth.uid() is not null
       and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
       and exists (
           select 1 from public.instance_operators o
           where o.email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
       );
$$;
