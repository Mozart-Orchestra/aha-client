#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), process.argv[2] || 'dist');
const rawBasePath = process.argv[3] || process.env.BASE_PATH || '';
const basePath = normalizeBasePath(rawBasePath);

if (!basePath) {
  console.log('[rewrite-web-base-path] BASE_PATH is empty; skipping.');
  process.exit(0);
}

const rewriteExtensions = new Set(['.css', '.html', '.js', '.json']);
let changedFiles = 0;

for await (const filePath of walk(outputDir)) {
  if (!rewriteExtensions.has(path.extname(filePath))) {
    continue;
  }

  const before = await fs.readFile(filePath, 'utf8');
  const after = rewriteAssetPaths(before, basePath);

  if (after !== before) {
    await fs.writeFile(filePath, after);
    changedFiles += 1;
  }
}

console.log(`[rewrite-web-base-path] Rewrote ${changedFiles} file(s) with base path ${basePath}.`);

function normalizeBasePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function rewriteAssetPaths(content, prefix) {
  return content
    .replace(/((?:href|src)=["'])\/(_expo|assets|favicon)/g, `$1${prefix}/$2`)
    .replace(/(["'`])\/(_expo|assets|favicon)/g, `$1${prefix}/$2`)
    .replace(/url\((["']?)\/(_expo|assets|favicon)/g, `url($1${prefix}/$2`);
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else if (entry.isFile()) {
      yield entryPath;
    }
  }
}
