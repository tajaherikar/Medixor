-- Migration: Normalize user roles and add permissions column
-- Date: 2026-04-11
-- Description: 
--   1. Add permissions JSONB column for module-based access control
--   2. Migrate legacy user roles (viewer, custom, etc.) to 'member'
--   3. Add CHECK constraint to enforce only 'admin' and 'member' roles

-- Step 1: Add permissions column if it doesn't exist
alter table users add column if not exists permissions jsonb;

-- Step 2: Migrate legacy user roles to 'member' if they exist
-- This is safe to re-run and will not affect valid roles
update users
set role = 'member'
where role not in ('admin', 'member');

-- Step 3: Add CHECK constraint to enforce only valid roles
-- Using a PL/pgSQL block to safely handle if constraint already exists
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'users'::regclass
  ) then
    alter table users
      add constraint users_role_check
      check (role in ('admin', 'member'));
  end if;
end
$$;

-- Log migration completion
-- select 'User roles normalized and permissions column added' as migration_status;
