-- What Supabase's components and the repository's migrations assume of a database, on a stock
-- PostgreSQL 17. Taken from Supabase's own Postgres image (migrations/db/init-scripts in
-- github.com/supabase/postgres) and its self-hosting stack, keeping only what Splitrip uses.
--
-- Run as the superuser, with the passwords in the environment rather than on the command line,
-- where any user on the host could read them:
--
--   PG_POSTGRES_PASSWORD=... PG_ADMIN_PASSWORD=... PG_AUTHENTICATOR_PASSWORD=... \
--   PG_AUTH_ADMIN_PASSWORD=... psql -f bootstrap.sql
--
-- Safe to run again: every object is created only when missing, and passwords are set every time,
-- so a second run changes nothing but what the configuration file says.

\set ON_ERROR_STOP on
\getenv postgres_password PG_POSTGRES_PASSWORD
\getenv admin_password PG_ADMIN_PASSWORD
\getenv authenticator_password PG_AUTHENTICATOR_PASSWORD
\getenv auth_admin_password PG_AUTH_ADMIN_PASSWORD

-- Roles ------------------------------------------------------------------------------------------

select format('create role %I', r)
from unnest(array[
    'supabase_admin', 'authenticator', 'supabase_auth_admin', 'supabase_realtime_admin',
    'anon', 'authenticated', 'service_role'
]) as r
where not exists (select from pg_roles where rolname = r)
\gexec

-- Realtime connects as the administrator and creates its own schemas in the database.
alter role supabase_admin with login superuser createdb createrole replication bypassrls;
alter role supabase_admin set search_path to public, extensions;

-- The roles a request runs as. PostgREST logs in as the authenticator and switches to one of them.
alter role anon nologin noinherit;
alter role authenticated nologin noinherit;
alter role service_role nologin noinherit bypassrls;
alter role authenticator with login noinherit;
grant anon, authenticated, service_role to authenticator;

alter role anon set statement_timeout = '3s';
alter role authenticated set statement_timeout = '8s';

-- Auth owns its schema and runs its own migrations in it.
alter role supabase_auth_admin with login noinherit createrole;
alter role supabase_auth_admin set search_path = auth;

alter role postgres with password :'postgres_password';
alter role supabase_admin with password :'admin_password';
alter role authenticator with password :'authenticator_password';
alter role supabase_auth_admin with password :'auth_admin_password';

-- Schemas and extensions -------------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;

create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role;

create schema if not exists _realtime authorization supabase_admin;

grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

alter database postgres set "app.settings.jwt_exp" to '3600';

-- Real time --------------------------------------------------------------------------------------

-- Empty: the migrations add the tables whose changes are published.
select 'create publication supabase_realtime'
where not exists (select from pg_publication where pubname = 'supabase_realtime')
\gexec
