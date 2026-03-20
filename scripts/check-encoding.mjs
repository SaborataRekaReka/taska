import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const allowedExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.yml',
  '.yaml',
  '.prisma',
  '.sql',
]);

const allowedNames = new Set([
  '.editorconfig',
  '.env.example',
]);

// Typical mojibake markers: UTF-8 text decoded as cp1251/latin1.
const suspiciousPattern = /[\u00D0\u00D1\u00C2\u00C3]|\u00E2\u20AC|\u00EF\u00BB\u00BF/u;

function listTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = result.stderr?.trim() || 'git ls-files failed';
    throw new Error(details);
  }
  return result.stdout
    .split('\u0000')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldScanFile(relativePath) {
  const fileName = path.basename(relativePath);
  if (allowedNames.has(fileName)) {
    return true;
  }
  const extension = path.extname(relativePath).toLowerCase();
  return allowedExtensions.has(extension);
}

function formatHit(relativePath, text) {
  const lines = text.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => suspiciousPattern.test(line));
  const sample = lineIndex >= 0 ? lines[lineIndex].trim() : '(unable to locate sample)';
  return `${relativePath}:${lineIndex + 1} -> ${sample}`;
}

function main() {
  const root = process.cwd();
  const files = listTrackedFiles();
  const hits = [];

  for (const relativePath of files) {
    if (!shouldScanFile(relativePath)) {
      continue;
    }

    const absolutePath = path.join(root, relativePath);
    let text;
    try {
      text = fs.readFileSync(absolutePath, 'utf8');
    } catch {
      continue;
    }

    if (suspiciousPattern.test(text)) {
      hits.push(formatHit(relativePath, text));
    }
  }

  if (hits.length > 0) {
    console.error('Found possible mojibake / broken encoding in tracked files:');
    for (const hit of hits) {
      console.error(`- ${hit}`);
    }
    process.exit(1);
  }

  console.log('Encoding check passed: no suspicious mojibake markers found.');
}

main();
