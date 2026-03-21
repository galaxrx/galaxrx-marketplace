/**
 * Clean .next and start dev server on port 3000.
 * Run: node scripts/clean-dev.js
 * Then open http://127.0.0.1:3000 in your browser.
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, maxRetries: 3 });
    console.log("  Cleared .next folder\n");
  } catch (e) {
    console.log("  Could not delete .next (close the dev server first):", e.message, "\n");
  }
}

const url = "http://127.0.0.1:3002";
console.log("  Starting dev server. Open in browser:", url, "\n");

spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", "3002"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NEXTAUTH_URL: url },
});
