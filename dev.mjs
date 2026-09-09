/**
 * Flowspace dev orchestrator.
 *
 *   npm run dev          -> infra (Redis/MySQL bila perlu) + API + Reverb + queue + scheduler + Vite
 *   npm run dev -- --only=api     (api | ws | queue | cron | vite)
 *
 * Semua proses dijalankan dari root; Ctrl+C mematikan semuanya.
 */
import { spawn, execSync } from "node:child_process";
import net from "node:net";

const SERVICE_PORTS = [8000, 8080, 5173];

const BACKEND = "backend";
const FRONTEND = "frontend";
const COLORS = {
  redis: "\x1b[33m",
  mysql: "\x1b[35m",
  api: "\x1b[36m",
  ws: "\x1b[94m",
  queue: "\x1b[32m",
  cron: "\x1b[90m",
  vite: "\x1b[38;5;208m",
};
const RESET = "\x1b[0m";

const only = (() => {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  return arg ? arg.split("=")[1] : null;
})();

// npm run stop -> force-stop everything this orchestrator may have started.
if (process.argv.includes("--shutdown")) {
  console.log("[dev] Stopping Flowspace services...");
  await killPorts(SERVICE_PORTS);
  console.log("[dev] Done.");
  process.exit(0);
}

const children = [];
let shuttingDown = false;

function log(label, line) {
  const color = COLORS[label] ?? "";
  console.log(`${color}[${label.padEnd(5)}]${RESET} ${line}`);
}

/** Spawn one managed process. Returns the ChildProcess. */
function run(label, command, args, cwd) {
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
    windowsHide: true,
  });
  children.push(proc);

  const pipe = (stream) => {
    if (!stream) return;
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) log(label, line);
    });
  };
  pipe(proc.stdout);
  pipe(proc.stderr);
  proc.on("exit", (code) => log(label, `exited (code ${code ?? "?"})`));

  return proc;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return true;
    await sleep(500);
  }
  log(label, `port ${port} tidak merespons dalam ${timeoutMs / 1000}s`);
  return false;
}

/** Kill whatever listens on the given ports (Windows pakai netstat, lainnya pakai lsof). */
async function killPorts(ports) {
  if (process.platform !== "win32") {
    for (const port of ports) {
      let out;
      try {
        out = execSync(`lsof -ti :${port}`, { shell: true }).toString();
      } catch {
        continue; // tidak ada yang listen di port ini
      }
      for (const pid of out.split(/\s+/)) {
        if (!/^\d+$/.test(pid)) continue;
        try {
          process.kill(Number(pid), "SIGKILL");
          console.log(`[dev] killed pid ${pid}`);
        } catch {
          // already gone
        }
      }
    }
    return;
  }
  let out;
  try {
    out = execSync("netstat -ano", { shell: true }).toString();
  } catch {
    return;
  }
  const wanted = new Set(ports);
  const pids = new Set();
  for (const line of out.split("\n")) {
    if (!line.includes("LISTENING")) continue;
    const match = line.trim().match(/127\.0\.0\.1|0\.0\.0\.0|\[::\]/) ? null : null;
    void match;
    const parts = line.trim().split(/\s+/);
    const local = parts[1] ?? "";
    const portStr = local.split(":").pop();
    if (wanted.has(Number(portStr)) && /^\d+$/.test(parts.at(-1))) {
      pids.add(parts.at(-1));
    }
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { shell: true });
      console.log(`[dev] killed pid ${pid}`);
    } catch {
      // already gone
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[dev] Shutting down...");

  // 1. Kill managed process trees.
  for (const proc of children) {
    if (proc.pid && proc.exitCode === null) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: true });
      } else {
        try {
          proc.kill("SIGKILL");
        } catch {
          // already gone
        }
      }
    }
  }

  // 2. Safety net: grandchildren (e.g. `artisan serve`) can escape the tree.
  void killPorts(SERVICE_PORTS).then(() => setTimeout(() => process.exit(0), 500));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------------------------------------------------------- main ----
console.log("[dev] Flowspace - starting everything from root\n");

if (!only || only === "redis") {
  if (await portOpen(6379)) {
    log("redis", "sudah berjalan di :6379 (dilewati)");
  } else {
    log("redis", "tidak terdeteksi di :6379 - coba 'docker compose up -d' atau jalankan redis-server manual");
    run("redis", "redis-server", [], ".");
    await waitForPort(6379, 10000, "redis");
  }
}

if (!only || only === "mysql") {
  if (await portOpen(3306)) {
    log("mysql", "sudah berjalan di :3306 (dilewati)");
  } else {
    log("mysql", "tidak terdeteksi di :3306 - coba 'docker compose up -d' atau jalankan MySQL manual");
    run("mysql", "mysqld", ["--console"], ".");
    await waitForPort(3306, 20000, "mysql");
  }
}

const wanted = only ? [only] : ["api", "ws", "queue", "cron", "vite"];

for (const svc of wanted) {
  switch (svc) {
    case "api":
      run("api", "php", ["artisan", "serve", "--port=8000"], BACKEND);
      break;
    case "ws":
      run("ws", "php", ["artisan", "reverb:start", "--port=8080"], BACKEND);
      break;
    case "queue":
      run("queue", "php", ["artisan", "queue:work", "--tries=1"], BACKEND);
      break;
    case "cron":
      run("cron", "php", ["artisan", "schedule:work"], BACKEND);
      break;
    case "vite":
      run("vite", "npm", ["run", "dev", "--", "--port=5173", "--strictPort", "--host=127.0.0.1"], FRONTEND);
      break;
    default:
      log("dev", `layanan tidak dikenal: ${svc}`);
  }
}

log("dev", "semua layanan diluncurkan - Ctrl+C untuk menghentikan");
