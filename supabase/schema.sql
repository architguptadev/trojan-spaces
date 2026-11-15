-- Run as a migration owner. Server-side Postgres client only.
CREATE TABLE IF NOT EXISTS public.records (
 id text PRIMARY KEY,
 owner text NOT NULL,
 kind text NOT NULL,
 data text NOT NULL
);
CREATE INDEX IF NOT EXISTS records_owner_kind ON public.records(owner, kind);
-- Prevent access via Supabase browser roles. The trusted server uses an appropriate DB role.
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.records FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.records FROM authenticated; END IF;
END $$;
-- For a restricted direct-connection application role, grant SELECT/INSERT/UPDATE/DELETE
-- and add policies suitable to that trusted server role, or use a server-only role with BYPASSRLS.
