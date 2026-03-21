# Migrations

## Deploying (production / staging)

Use **deploy** so migrations run against your real database:

```bash
npx prisma migrate deploy
```

## Why `migrate dev` fails (P3006 / P1001)

`npx prisma migrate dev` (and `--create-only`) uses a **shadow database** on the same server. That causes two issues here:

1. **P3006** – The first migration is a no-op, so the shadow DB has no tables and later migrations fail (e.g. “table Order does not exist”).
2. **P1001 (Supabase)** – “Can’t reach database server” when using the **pooler** URL (`pooler.supabase.com`). The pooler often can’t create or use a shadow database. Using the **direct** connection URL sometimes works, but Supabase usually allows only one database per project, so creating a shadow DB still fails.

So in this project, **do not use `migrate dev`**. Use the workflow below instead.

## Creating a new migration (no shadow DB)

1. **Edit** `prisma/schema.prisma` (add/change models or fields).

2. **Generate migration SQL** using the script (reads from your current DB + schema; no shadow DB):

   ```bash
   node scripts/create-migration.js descriptive_name
   ```

   Example: `node scripts/create-migration.js add_user_preferences`  
   This creates `prisma/migrations/YYYYMMDD000000_descriptive_name/migration.sql`.

3. **Apply the migration**:

   ```bash
   npx prisma migrate deploy
   ```

Make sure `.env` has `DATABASE_URL` set. If you use Supabase, try the **Direct connection** URL (not the pooler) when running the script if you get a connection error.

## Manual alternative (without script)

If you prefer not to use the script:

1. Create the folder: `prisma/migrations/YYYYMMDD000000_your_name/`.
2. Generate SQL:
   ```bash
   npx prisma migrate diff --from-url "%DATABASE_URL%" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/YYYYMMDD000000_your_name/migration.sql
   ```
   (On PowerShell use `$env:DATABASE_URL`; on Bash use `$DATABASE_URL`.)
3. Run `npx prisma migrate deploy`.
