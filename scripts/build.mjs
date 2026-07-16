// Bundles src/main.js → dist/app.js, injecting the package version as
// __APP_VERSION__ (used by the analytics event contract). Replaces the inline
// esbuild CLI so the version is sourced from package.json cross-platform.
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  minify: true,
  outfile: "dist/app.js",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
