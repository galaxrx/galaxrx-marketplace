# Testing the app (test users & buy/sell)

The seed creates **multiple test pharmacies** and **sample listings** so you can test buying and selling without real users.

---

## 1. Seed the database

```bash
npm run db:push
npm run db:seed
```

This creates:

- **500 drug master records** (for search and listing).
- **4 test pharmacies** (only if that email/ABN doesn’t already exist).
- **6 sample listings** from two “seller” pharmacies (only if they have no listings yet).

---

## 2. Test logins (password for all: `TestPassword1`)

| Role   | Email                   | Use for                          |
|--------|-------------------------|-----------------------------------|
| Buyer  | `buyer@galaxrx.com.au`  | Browse and **buy** from others   |
| Seller | `seller1@galaxrx.com.au`| Has listings; **sell** to buyer  |
| Seller | `seller2@galaxrx.com.au`| Has listings; **sell** to buyer  |
| Extra  | `test@galaxrx.com.au`  | Any testing                      |

---

## 3. Check that the app is working

**As buyer (buy from seeded listings):**

1. Log in as **buyer@galaxrx.com.au** / **TestPassword1**.
2. Go to **Buy Stock** — you should see OTC listings from Northside Chemist and Westside Pharmacy.
3. Open a listing and click **Buy Now** (payment will use Stripe test mode if configured).

**As seller (sell to buyer):**

1. Log in as **seller1@galaxrx.com.au** or **seller2@galaxrx.com.au** / **TestPassword1**.
2. Go to **My Listings** — you should see the seeded listings.
3. Go to **Sell Stock** to add more (search by name or barcode).
4. When “buyer” places an order, check **My Orders** and **Messages**.

**Optional:**

- Log in as **buyer**, place an order from a listing, then log in as **seller1** or **seller2** and confirm the order and messages.

---

## 4. If you need more users

- **Register through the UI:** [http://localhost:3000/register](http://localhost:3000/register) — use a new email and ABN (e.g. 44444444444).
- Re-running **`npm run db:seed`** only adds test pharmacies that don’t already exist (by email or ABN); it won’t duplicate them or re-create listings for sellers that already have listings.
