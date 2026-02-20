/**
 * extract-svgs.mjs
 *
 * Extracts raw SVG files from @zydon/common icons.
 * - Custom icons: reads TSX source files and extracts SVG markup
 * - HugeIcons: creates placeholders (rendered live in browser via Icon component)
 *
 * Usage: node scripts/extract-svgs.mjs [--common-path /path/to/common-react]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const commonPathArg = process.argv.indexOf('--common-path');
const COMMON_PATH = commonPathArg !== -1
  ? resolve(process.argv[commonPathArg + 1])
  : resolve(ROOT, '../common-react');

// Load metadata
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'public/icons-metadata.json'), 'utf-8'));

function enumToKebab(str) {
  return str.toLowerCase().replace(/_/g, '-');
}

function extractSvgFromTsx(content) {
  // Extract the SVG tag and its contents from TSX source
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) return null;

  let svg = svgMatch[0];

  // Clean up JSX-specific attributes
  svg = svg
    .replace(/\{\.\.\.props\}/g, '')
    .replace(/className=\{[^}]+\}/g, '')
    .replace(/\bstroke=\{[^}]+\}/g, 'stroke="currentColor"')
    .replace(/\bfill=\{[^}]+\}/g, '')
    .replace(/\bstyle=\{[^}]+\}/g, '')
    // Convert JSX camelCase to SVG kebab-case
    .replace(/\bfillRule=/g, 'fill-rule=')
    .replace(/\bclipRule=/g, 'clip-rule=')
    .replace(/\bstrokeWidth=/g, 'stroke-width=')
    .replace(/\bstrokeLinecap=/g, 'stroke-linecap=')
    .replace(/\bstrokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/\bstrokeMiterlimit=/g, 'stroke-miterlimit=')
    .replace(/\bfillOpacity=/g, 'fill-opacity=')
    .replace(/\bstopColor=/g, 'stop-color=')
    .replace(/\bstopOpacity=/g, 'stop-opacity=')
    .replace(/\bclipPath=/g, 'clip-path=')
    // Clean empty attributes and excessive whitespace
    .replace(/\s+>/g, '>')
    .replace(/\s{2,}/g, ' ');

  // Add xmlns if missing
  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Set standard dimensions if not present
  if (!svg.includes('width=')) {
    svg = svg.replace('<svg', '<svg width="24" height="24"');
  }

  return svg;
}

// Map enum names to their custom SVG source file paths
function buildCustomIconPathMap() {
  const iconComponentPath = resolve(COMMON_PATH, 'src/components/Icon/index.tsx');
  if (!existsSync(iconComponentPath)) return {};

  const content = readFileSync(iconComponentPath, 'utf-8');
  const pathMap = {};

  // Parse custom imports: import VarName from 'assets/path/FileName';
  const importRegex = /import\s+(\w+)\s+from\s+'assets\/([^']+)'/g;
  const importMap = {};
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    importMap[m[1]] = m[2];
  }

  // Parse ICONS mapping: [IconEnum.ENUM_NAME]: ImportedVarName
  const mappingRegex = /\[IconEnum\.(\w+)\]\s*:\s*(\w+)/g;
  while ((m = mappingRegex.exec(content)) !== null) {
    const [, enumName, varName] = m;
    if (importMap[varName]) {
      pathMap[enumName] = importMap[varName];
    }
  }

  return pathMap;
}

// --- Main ---

const customPathMap = buildCustomIconPathMap();
const svgsDir = resolve(ROOT, 'public/svgs');
let extracted = 0;
let skipped = 0;

for (const icon of metadata) {
  const categoryDir = resolve(svgsDir, enumToKebab(icon.category));
  mkdirSync(categoryDir, { recursive: true });

  const outPath = resolve(categoryDir, `${enumToKebab(icon.enumName)}.svg`);

  if (icon.source === 'custom' && customPathMap[icon.enumName]) {
    const relPath = customPathMap[icon.enumName];
    const tsxPath = resolve(COMMON_PATH, 'src/assets', relPath + '.tsx');

    if (existsSync(tsxPath)) {
      const content = readFileSync(tsxPath, 'utf-8');
      const svg = extractSvgFromTsx(content);
      if (svg) {
        writeFileSync(outPath, svg);
        extracted++;
        continue;
      }
    }
  }

  // For HugeIcons: create a minimal placeholder SVG
  // These are rendered live in the browser via the actual Icon component
  const label = icon.displayName.substring(0, 8);
  const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="4" fill="#f5f5f5"/>
  <text x="12" y="14" text-anchor="middle" font-size="5" fill="#999">${label}</text>
</svg>`;
  writeFileSync(outPath, placeholder);
  skipped++;
}

console.log(`Extracted ${extracted} custom SVGs`);
console.log(`Created ${skipped} placeholder SVGs (HugeIcons — rendered live in browser)`);
console.log(`Total: ${extracted + skipped} SVG files in public/svgs/`);
