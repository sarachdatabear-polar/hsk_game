#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 8000;
const TYPES = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".webp":"image/webp",
  ".mp3":"audio/mpeg", ".woff2":"font/woff2", ".webmanifest":"application/manifest+json",
};

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if(pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(ROOT, "." + pathname);
  if(file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end("Forbidden"); return;
  }
  fs.stat(file, (statErr, stat) => {
    if(statErr || !stat.isFile()){ res.writeHead(404).end("Not found"); return; }
    res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(file).on("error", () => res.writeHead(500).end("Read error")).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Lucky Cat HSK dev server: http://localhost:${PORT}`);
});
