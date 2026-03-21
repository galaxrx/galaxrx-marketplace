# Baselining an existing database (P3005)

If you see **P3005: The database schema is not empty**, your database was created outside Prisma Migrate (e.g. `prisma db push`). Do this once:

## Step 1: Mark the baseline as already applied

This tells Prisma "the database is already at this migration" without running any SQL:

```bash
npx prisma migrate resolve --applied "20250315000000_baseline"
```

## Step 2: Apply the remaining migrations

This adds the `chargeModel` and `totalChargedCents` columns to `Order`:

```bash
npx prisma migrate deploy
```

After this, you can use `prisma migrate deploy` (or `migrate dev`) as usual for new migrations.
