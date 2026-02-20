/**
 * check-version.mjs
 *
 * Compares npm @zydon/common version with last build version.
 * Exits with code 0 if versions differ (rebuild needed), 1 if same.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read local common-react version
const commonPathArg = process.argv.indexOf('--common-path');
const commonPath = commonPathArg !== -1
  ? resolve(process.argv[commonPathArg + 1])
  : resolve(ROOT, '../common-react');

let currentVersion;
try {
  const pkg = JSON.parse(readFileSync(resolve(commonPath, 'package.json'), 'utf-8'));
  currentVersion = pkg.version;
} catch {
  console.log('Could not read common-react package.json');
  process.exit(1);
}

let lastVersion;
try {
  lastVersion = readFileSync(resolve(ROOT, '.last-version'), 'utf-8').trim();
} catch {
  lastVersion = 'none';
}

console.log(`Current: ${currentVersion}`);
console.log(`Last built: ${lastVersion}`);

if (currentVersion !== lastVersion) {
  console.log('Version changed — rebuild needed');
  process.exit(0);
} else {
  console.log('Version unchanged — skip');
  process.exit(1);
}
