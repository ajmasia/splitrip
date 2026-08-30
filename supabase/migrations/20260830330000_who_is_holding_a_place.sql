-- The trip screen offers to hand somebody the application, and had no way to know whether that
-- would be any use: a place held by an account cannot be taken from a link, so the button beside
-- one could only ever produce a link that asks for a password its holder already has.
--
-- What is missing is one boolean the screen cannot read for itself — whether the device on a place
-- belongs to an account — because it lives in `auth.users`, which no client may read.
--
-- A definer view rather than an invoker one, for that reason, and with the membership check written
-- into it by hand. That check is doing the work Row Level Security does everywhere else here, so it
-- is not an exception to the rule: it is the same rule, stated where the policy cannot reach.

create view public.participant_devices
with (security_invoker = false) as
select
    p.id,
    p.trip_id,
    p.user_id is not null as has_device,
    exists (
        select 1 from auth.users u
        where u.id = p.user_id and coalesce(u.is_anonymous, false) = false
    ) as holds_account
from public.participants p
where public.is_trip_member(p.trip_id);

comment on view public.participant_devices is
    'Whether each participant of a trip you are on is answering from a device, and whether that
     device is an account. Nothing else about them, and nothing at all about a trip you are not on.';

revoke all on public.participant_devices from public;
grant select on public.participant_devices to authenticated;
