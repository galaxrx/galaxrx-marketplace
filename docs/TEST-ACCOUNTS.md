# Test accounts (for buying and selling)

After running **`npm run db:seed`**, you can sign in with these accounts. All use the same password.

## Password (all accounts) — copy and paste to avoid typos

```
TestPassword1
```

**On the login page:** use the **Email** field (full email below) and **Password** field. Paste the password exactly as above (capital T, capital P, then `assword1`).

## Buyer accounts (use these to test checkout)

| Email (use in "Email" field) | Name |
|------------------------------|------|
| **buyer@galaxrx.com.au** | City Central Pharmacy |
| **testbuyer@galaxrx.com.au** | Test Buyer Pharmacy |

Sign in with the **full email** (e.g. `testbuyer@galaxrx.com.au`) and password `TestPassword1`, then open any listing from another pharmacy — you’ll see the **Buy Now** button.

## Seller accounts (have sample listings after seed)

| Email | Name |
|-------|------|
| seller1@galaxrx.com.au | Northside Chemist |
| seller2@galaxrx.com.au | Westside Pharmacy |

## Other

| Email | Name |
|-------|------|
| test@galaxrx.com.au | Test Pharmacy |

---

**To create the test accounts:** run `npm run db:seed`.  
If an account with that email or ABN already exists, the seed skips it (it won’t overwrite your data).
