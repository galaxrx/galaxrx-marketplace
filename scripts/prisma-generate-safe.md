# Fix EPERM when running `npx prisma generate`

Windows locks the Prisma client file when the dev server (or any Node process) is using it. Do this **in order**:

## Steps

1. **Stop the dev server**
   - In the terminal where `npm run dev` is running, press **Ctrl+C**.
   - Wait until the process exits.

2. **Close other terminals**
   - Close any other terminal tabs/windows that might be running this project (e.g. another `npm run dev`, tests, or scripts).

3. **Open a new terminal**
   - Open a **new** PowerShell or Command Prompt (outside Cursor if needed).

4. **Run generate**
   ```bash
   cd "F:\GalaxRX\GalaxRX Market Place"
   npx prisma generate
   ```

5. **Start the dev server again**
   ```bash
   npm run dev
   ```

## If it still fails

- **Restart your computer** (releases all file locks), then run `npx prisma generate` **before** starting the dev server.
- Or run `npx prisma generate` from **Command Prompt** (not PowerShell) after closing every Cursor/VS Code terminal.
