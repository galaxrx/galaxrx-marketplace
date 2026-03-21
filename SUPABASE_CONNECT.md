# Fix: Can't reach database server (P1001)

If `npm run db:push` fails with **P1001**, try these in order.

---

## 1. Unpause the project (free tier)

Free Supabase projects **pause after ~7 days** of no use.

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select project **wamihakjjvwjlxlyznov**.
3. If you see **“Project is paused”**, click **Restore project** and wait until it’s running.

Then run again:

```powershell
npm run db:push
```

---

## 2. Use the Connection pooler (port 6543)

Some networks block direct DB port 5432. Use the **pooler** (port 6543) instead.

1. In Supabase: your project → **Settings** (gear) → **Database**.
2. Under **Connection string**, open the **“Connection pooling”** tab.
3. Choose **“Transaction”** (or **“Session”** if you prefer).
4. Copy the **URI** (it will look like one of these):
   - **Transaction:**  
     `postgresql://postgres.wamihakjjvwjlxlyznov:[YOUR-PASSWORD]@aws-0-XX-XXXX-X.pooler.supabase.com:6543/postgres`
   - **Session:**  
     `postgresql://postgres.wamihakjjvwjlxlyznov:[YOUR-PASSWORD]@aws-0-XX-XXXX-X.pooler.supabase.com:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with your **database password** (if the password has `@`, use `%40` instead).
6. For **Transaction** (6543), add at the end: `?pgbouncer=true`  
   Example:  
   `.../postgres?pgbouncer=true`
7. Put the final string in `.env` as `DATABASE_URL`:

   ```env
   DATABASE_URL="postgresql://postgres.wamihakjjvwjlxlyznov:YOUR_PASSWORD@aws-0-XX-XXXX-X.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

8. Run again:

   ```powershell
   npm run db:push
   ```

---

## 3. Other checks

- **VPN:** Turn off VPN and try again.
- **Firewall:** Allow outbound to the Supabase host and port (5432 or 6543).
- **Password:** If it has `@`, `#`, `%`, `?`, `&`, encode them in the URL (e.g. `@` → `%40`).
