# Database Migrations Guide

This document explains how to apply database migrations to the Medixor project.

## Migration Files

Migrations are stored in `supabase/migrations/` and are numbered sequentially:

- `001_doctor_target_calculation.sql` - Doctor target calculation logic
- `002_doctor_should_sell_calculation.sql` - Doctor should-sell calculation logic
- `003_normalize_user_roles.sql` - **NEW** User role normalization and permissions system

## Applying Migrations

### Option 1: Using Supabase CLI (Recommended for Local/Development)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Pull latest remote migrations
supabase migration list

# Run all pending migrations locally
supabase migration up
```

### Option 2: Manual SQL Execution (Supabase Dashboard)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to SQL Editor
4. Create a new query and copy the migration SQL
5. Run the query

### Option 3: Using Supabase Push (Development Environment)

```bash
supabase push
```

This will:
- Apply all pending migrations
- Deploy any new functions/triggers
- Update RLS policies

## Migration Details: v003_normalize_user_roles

**Purpose**: Implement user role simplification and permissions system

**Changes**:
1. ✅ Adds `permissions` JSONB column to `users` table
2. ✅ Migrates legacy roles (viewer, custom) → 'member'
3. ✅ Adds CHECK constraint to enforce only 'admin'/'member' roles

**Why This Matters**:
- Prevents invalid role values in production (data hygiene)
- Enforces valid roles at database level (type safety)
- Enables new permission-based module access control

**Idempotent**: ✅ Yes - Safe to re-run without errors

## Post-Migration Setup

After migrations are applied, run the seed script to populate demo data:

```bash
npx tsx scripts/seed.ts
```

This will:
- Create demo suppliers, batches, customers
- Create demo team members with correct roles
- Populate default project data

## Rollback Strategy

If you need to rollback a migration, you have two options:

### Local Development (Supabase CLI)
```bash
supabase migration down
```

### Production (Manual)
Contact your database administrator or create a manual rollback query. Never rollback without explicit approval.

## Required Environment Variables

For migrations to work, ensure these are in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Verification

After migration is applied, verify the changes:

```sql
-- Check that permissions column exists
select column_name, data_type 
from information_schema.columns 
where table_name = 'users' and column_name = 'permissions';

-- Check that all roles are valid
select distinct role from users;
-- Should only show: 'admin', 'member'

-- Check constraint exists
select constraint_name 
from information_schema.table_constraints 
where table_name = 'users' and constraint_name = 'users_role_check';
```

## Troubleshooting

**Migration fails with column already exists error**: This is normal - the migration includes `IF NOT EXISTS` to be idempotent. No action needed.

**CHECK constraint fails**: All existing 'viewer'/'custom' roles must be updated to 'member' before the constraint can be added. The migration handles this automatically.

**Permissions column shows NULL**: This is expected for existing users. The application fills in defaults based on role:
- Admins: Full access
- Members: ["billing", "inventory"] by default, choose others optionally

## References

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/managing-postgres)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [JSONB In PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html)
