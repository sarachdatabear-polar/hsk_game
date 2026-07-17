#!/usr/bin/env node
// Capacitor CLI 6 compiles `import tar from "tar"` into a `.default.extract`
// call. Patched tar 7 correctly exposes named/CommonJS exports and marks the
// object as an ES module, so tslib does not synthesize `.default`. Keep the
// security override while accepting either export shape until Capacitor can
// be upgraded as one coordinated native-platform change.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(ROOT, "node_modules", "@capacitor", "cli", "dist", "util", "template.js");
const oldCall = "await tar_1.default.extract({ file: src, cwd: dir });";
const compatCall = "await (tar_1.default || tar_1).extract({ file: src, cwd: dir });";

// Production-only installs omit the dev-only Capacitor CLI and need no patch.
if (!existsSync(TARGET)) {
  console.log("capacitor-tar-compat: Capacitor CLI not installed; nothing to patch");
  process.exit(0);
}

const source = readFileSync(TARGET, "utf8");
if (source.includes(compatCall)) {
  console.log("capacitor-tar-compat: already applied");
} else if (source.includes(oldCall)) {
  writeFileSync(TARGET, source.replace(oldCall, compatCall));
  console.log("capacitor-tar-compat: patched Capacitor CLI 6 for tar 7");
} else {
  throw new Error("capacitor-tar-compat: expected Capacitor template call not found");
}
