import { spawn } from "node:child_process";

const command = process.argv[2];

if (!["dev", "build"].includes(command)) {
  console.error("Usage: node scripts/desktop-run.mjs <dev|build>");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const executable = isWindows ? "scripts\\with-vsdev.cmd" : "npm";
const args = isWindows
  ? ["npm", "run", "tauri", "--", command]
  : ["run", "tauri", "--", command];

const child = spawn(executable, args, {
  stdio: "inherit",
  shell: isWindows,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
