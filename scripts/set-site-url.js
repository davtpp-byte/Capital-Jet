#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_ORIGIN = "https://capitaljet.netlify.app";
const rawTarget = (process.env.SITE_URL || process.env.URL || "").trim().replace(/\/+$/, "");

if (!rawTarget || !/^https?:\/\//i.test(rawTarget) || rawTarget === DEFAULT_ORIGIN) {
  console.log(`[set-site-url] Using default origin: ${DEFAULT_ORIGIN}`);
  process.exit(0);
}

const SKIP_DIRS = new Set([".git", "node_modules", "netlify", "scripts", "wp-content"]);
let updatedFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const fullPath = path.join(dir, entry.name);
    const content = fs.readFileSync(fullPath, "utf8");
    if (!content.includes(DEFAULT_ORIGIN)) continue;
    const next = content.split(DEFAULT_ORIGIN).join(rawTarget);
    if (next !== content) {
      fs.writeFileSync(fullPath, next, "utf8");
      updatedFiles++;
    }
  }
}

walk(process.cwd());
console.log(`[set-site-url] Rewrote social preview origin to ${rawTarget} in ${updatedFiles} HTML files.`);
