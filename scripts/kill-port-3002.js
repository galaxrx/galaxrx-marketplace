/**
 * Kill the process using port 3002 (Windows).
 * Run: node scripts/kill-port-3002.js
 * Then start the app again with: npm run dev
 */
const { execSync } = require("child_process");

try {
  const out = execSync("netstat -ano | findstr :3002", { encoding: "utf-8" });
  const lines = out.trim().split("\n").filter((l) => l.includes("LISTENING"));
  if (lines.length === 0) {
    console.log("Port 3002 is not in use.");
    process.exit(0);
  }
  const pid = lines[0].split(/\s+/).pop();
  if (!pid || pid === "0") {
    console.log("Could not get PID.");
    process.exit(1);
  }
  console.log("Killing process on port 3002 (PID " + pid + ")...");
  execSync("taskkill /PID " + pid + " /F", { stdio: "inherit" });
  console.log("Done. You can now run: npm run dev");
} catch (e) {
  if (e.status === 1 && e.stdout === "") {
    console.log("Port 3002 is not in use.");
  } else {
    console.error(e.message || e);
    process.exit(1);
  }
}
