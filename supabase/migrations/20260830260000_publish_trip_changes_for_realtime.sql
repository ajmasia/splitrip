-- Realtime carries nothing until a table is published. Supabase creates the publication empty, so
-- this is what turns "several phones with the same screen open" from a promise into a fact.
--
-- What is published is what a trip screen reads: its expenses, its payments, who is on it, the trip
-- itself and its activity. `expense_shares` is deliberately absent — a share never changes without
-- its expense changing in the same transaction, so publishing it would only double every event.
--
-- Isolation is not the `trip_id` filter a client subscribes with, which is a convenience it could
-- simply omit. It is Row Level Security: Realtime evaluates the table policies against each
-- subscriber before delivering, so a client cannot receive a trip it does not belong to even by
-- asking for it deliberately.

alter publication supabase_realtime add table
    public.trips,
    public.participants,
    public.expenses,
    public.payments,
    public.activity;

-- A deletion carries only the primary key by default, and a policy cannot be evaluated against a
-- key alone: with RLS on, the event would be dropped rather than delivered, and an expense somebody
-- removed would stay on everybody else's screen until they reloaded. These two are the only tables
-- rows are deleted from; the rest are inserted into, updated, or voided.
alter table public.expenses replica identity full;
alter table public.participants replica identity full;
