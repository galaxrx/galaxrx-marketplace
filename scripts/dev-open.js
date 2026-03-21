/**
 * Start Next.js dev server on the first available port (3000–3010),
 * wait until the server is listening (TCP), then open the browser.
 * Uses Turbopack for faster compiles. Does not hit /api/health (avoids slow first compile).
 * Run: npm run dev
 */
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const PORT_MIN = 3000;
const PORT_MAX = 3010;
const POLL_INTERVAL_MS = 300;
const READY_TIMEOUT_MS = 60000;
const OPEN_BROWSER_FALLBACK_MS = 25000;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    let port = PORT_MIN;
    function tryPort() {
      if (port > PORT_MAX) {
        reject(new Error(`No available port between ${PORT_MIN} and ${PORT_MAX}. Close other apps using these ports.`));
        return;
      }
      const server = net.createServer();
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          port++;
          tryPort();
        } else {
          reject(err);
        }
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port, "127.0.0.1");
    }
    tryPort();
  });
}

/** Wait until the dev server is accepting TCP connections (avoids triggering /api/health compile). */
function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    function tryConnect() {
      if (Date.now() > deadline) {
        reject(new Error("Server did not start in time."));
        return;
      }
      const socket = net.createConnection(port, "127.0.0.1", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        setTimeout(tryConnect, POLL_INTERVAL_MS);
      });
      socket.setTimeout(2000, () => {
        socket.destroy();
        setTimeout(tryConnect, POLL_INTERVAL_MS);
      });
    }
    tryConnect();
  });
}

function openBrowser(url) {
  const plat = process.platform;
  if (plat === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: true });
  } else if (plat === "darwin") {
    spawn("open", [url], { stdio: "ignore" });
  } else {
    spawn("xdg-open", [url], { stdio: "ignore" });
  }
  console.log("  Opening browser at " + url + " ...");
}

async function main() {
  let port;
  try {
    port = await findAvailablePort();
  } catch (e) {
    console.error("\n  " + e.message + "\n");
    process.exit(1);
  }

  const url = `http://127.0.0.1:${port}`;
  const useTurbo = process.env.TURBO === "1";
  console.log("\n  App URL: " + url);
  console.log("  Waiting for server to listen, then opening browser" + (useTurbo ? " (Turbopack enabled)..." : "...") + "\n");

  const nextArgs = ["next", "dev", "-H", "127.0.0.1", "-p", String(port)];
  if (useTurbo) nextArgs.splice(2, 0, "--turbo");
  const next = spawn("npx", nextArgs, {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXTAUTH_URL: url, PORT: String(port) },
  });

  let opened = false;
  function doOpen() {
    if (opened) return;
    opened = true;
    openBrowser(url);
  }

  next.on("exit", (code, signal) => {
    if (!opened) {
      if (code !== 0 && code !== null) console.error("\n  Server exited with code " + code + "\n");
      process.exit(code !== null ? code : 1);
    }
  });

  // Fallback: open browser after N seconds even if health check hasn't passed yet
  const fallbackTimer = setTimeout(() => {
    if (!opened) {
      console.log("  Server taking a while to compile — opening browser anyway. Refresh if the page is blank.\n");
      doOpen();
    }
  }, OPEN_BROWSER_FALLBACK_MS);

  try {
    await waitForPort(port);
    clearTimeout(fallbackTimer);
    doOpen();
    // Warm up home page in background so first load is often already compiled
    const http = require("http");
    http.get(`${url}/`, (res) => { res.resume(); }).on("error", () => {});
  } catch (e) {
    clearTimeout(fallbackTimer);
    if (opened) return;
    console.error("\n  " + (e.message || e) + "\n");
    next.kill("SIGTERM");
    process.exit(1);
  }
}

main();
