# PBS / TGA integration

The app can fill its drug catalog from **Australian PBS (Pharmaceutical Benefits Scheme)** data via API or CSV.

## Option A: PBS API (when available)

- **Docs:** [data.pbs.gov.au](https://data.pbs.gov.au/)
- **Public API:** No sign-up. Rate limit: 1 request per 20 seconds (shared).
- The **pilot endpoint** (`aucapiapppbspilot.azurewebsites.net`) is **disabled (403)**. Use the production API or CSV (Option B).

### Using the PBS API (public v3)

1. In `.env` set:
   - **`PBS_API_BASE`** — `https://data-api.health.gov.au/pbs/api/v3`
   - **`PBS_PUBLIC_KEY`** — your subscription key (sent as `Ocp-Apim-Subscription-Key`).
2. Run:
   ```bash
   npm run sync:pbs
   ```
   This fetches schedules and ITEM data and inserts new rows into `DrugMaster` (skips existing `pbsCode`).

## Option B: PBS CSV import (recommended if API is down)

PBS publishes **monthly CSV files** with the same data as the API.

1. **Download** the ITEM (or equivalent) CSV from:
   - [PBS Data – data distribution](https://data.pbs.gov.au/) or
   - [PBS Downloads](https://www.pbs.gov.au/info/browse/download)
2. **Run the import:**
   ```bash
   npm run sync:pbs-csv -- path/to/ITEM.csv
   ```
   Example:
   ```bash
   npm run sync:pbs-csv -- ./downloads/ITEM.csv
   ```
   The script expects a header row with columns such as `DRUG_NAME`, `BRAND_NAME`, `LI_FORM`, `PACK_SIZE`, `PBS_CODE`. New rows are inserted; existing `pbsCode` are skipped.

3. **After sync:** “Sell stock” search uses your database, so PBS-synced products appear in the list.

## TGA

TGA (ARTG) does not offer a full public API. Use [ARTG search + export](https://compliance.health.gov.au/artg/) or [TGA datasets](https://www.tga.gov.au/resources/datasets) and import via your own CSV if you need non-PBS products.
