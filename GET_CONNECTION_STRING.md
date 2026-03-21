# Get the correct connection string (fix "Tenant or user not found")

The pooler needs the **exact** host and username from your project. Do this:

---

## Step 1: Open the Connect panel

1. Go to **https://supabase.com/dashboard**
2. Click your project: **galaxrx's Project**
3. In the **top right**, click the green **"Connect"** button  
   (or go to **Settings** → **Database** and scroll to **Connection string**)

---

## Step 2: Copy the Session pooler URI

1. In the connection options, find **"Connection pooling"** or **"Session"**
2. Select **Session** (or **Connection pooling** → Session mode)
3. You should see a URI like:
   ```
   postgresql://postgres.XXXXXXXXXX:[YOUR-PASSWORD]@aws-0-XX-XXXX-X.pooler.supabase.com:5432/postgres
   ```
4. Click **Copy** to copy the **entire** URI (do not type it by hand)

---

## Step 3: Put it in .env

1. Open **`F:\GalaxRX\GalaxRX Market Place\.env`** in Notepad
2. Find the line: `DATABASE_URL="..."`
3. **Replace the whole line** with:
   ```
   DATABASE_URL="PASTE_THE_COPIED_URI_HERE"
   ```
4. In the pasted URI, replace **`[YOUR-PASSWORD]`** with your real database password  
   - If your password contains **@**, change that **@** to **%40**
5. Save the file (Ctrl+S)

---

## Step 4: Run db:push

```powershell
cd "F:\GalaxRX\GalaxRX Market Place"
npm run db:push
```

---

## Check your project reference

The project ref is in the **browser URL** when you’re in the project:

- Example: `https://supabase.com/dashboard/project/wamihakjjvwjlxlyznov/...`
- The ref is: **wamihakjjvwjlxlyznov**

The connection string must use that same ref in the username: `postgres.wamihakjjvwjlxlyznov` (or whatever your URL shows).
