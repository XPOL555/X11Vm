#!/usr/bin/env node
// Bumps the app version across the 3 files that must stay in sync:
// package.json, src-tauri/Cargo.toml, and src-tauri/tauri.conf.json.
// Usage:
//   bun run version:bump patch|minor|major
//   bun run version:bump 1.2.3

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(rootDir, "package.json");
const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = join(rootDir, "src-tauri", "Cargo.toml");

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

function parseArg(arg, currentVersion) {
  if (SEMVER_RE.test(arg)) return arg;

  const [major, minor, patch] = currentVersion.split(".").map(Number);
  switch (arg) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      console.error(
        `Invalid argument "${arg}". Use "patch", "minor", "major", or an explicit x.y.z version.`
      );
      process.exit(1);
  }
}

function updatePackageJson(newVersion) {
  const raw = readFileSync(packageJsonPath, "utf8");
  const updated = raw.replace(
    /^(\s*"version":\s*")[^"]+(")/m,
    `$1${newVersion}$2`
  );
  writeFileSync(packageJsonPath, updated);
}

function updateTauriConf(newVersion) {
  const raw = readFileSync(tauriConfPath, "utf8");
  const updated = raw.replace(
    /^(\s*"version":\s*")[^"]+(")/m,
    `$1${newVersion}$2`
  );
  writeFileSync(tauriConfPath, updated);
}

function updateCargoToml(newVersion) {
  const raw = readFileSync(cargoTomlPath, "utf8");
  // Only the [package] version starts at column 0 as `version = "..."`;
  // dependency versions are always nested (`name = { version = "...", ... }`
  // or `name = "..."`), so this regex can't accidentally match them.
  const updated = raw.replace(
    /^version = "[^"]+"$/m,
    `version = "${newVersion}"`
  );
  writeFileSync(cargoTomlPath, updated);
}

function currentPackageJsonVersion() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
}

function refreshCargoLock() {
  try {
    execFileSync("cargo", ["check", "--quiet"], {
      cwd: join(rootDir, "src-tauri"),
      stdio: "inherit",
    });
  } catch (e) {
    console.warn(
      "Warning: couldn't run `cargo check` to refresh Cargo.lock automatically. " +
        "Run it manually in src-tauri/ before committing."
    );
  }
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: bump-version.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const currentVersion = currentPackageJsonVersion();
const newVersion = parseArg(arg, currentVersion);

updatePackageJson(newVersion);
updateTauriConf(newVersion);
updateCargoToml(newVersion);
refreshCargoLock();

console.log(`Bumped version: ${currentVersion} -> ${newVersion}`);
console.log("Updated: package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml");
