# Common Icons

Browsable, searchable catalog of all design system icons.

**Live at:** [common-icons.jeansouza.dev](https://common-icons.jeansouza.dev)

---

## Features

- All 498+ icons rendered using the actual `@zydon/common` Icon component
- Search by name, tag, or category
- 30 categories with tag-based filtering
- Click-to-copy `IconEnum.NAME` for quick usage
- Raw SVG exports in `/svgs/`
- Auto-rebuilds daily when `@zydon/common` publishes a new version

## Development

```bash
npm install
npm run generate           # Generate icons-metadata.json
npm run extract-svgs       # Extract raw SVG files
npm run dev                # Start dev server
npm run build              # Production build
```

## How It Works

1. `scripts/generate-metadata.mjs` reads `common-react` source to extract all `IconEnum` entries, categorize them, and assign search tags
2. `scripts/extract-svgs.mjs` extracts raw SVG markup from custom icon TSX files
3. The Vite React app loads `icons-metadata.json` at runtime and renders icons via `@zydon/common`'s `Icon` component
4. GitHub Actions rebuilds and deploys to GitHub Pages when `@zydon/common` version changes

## Stack

- React 18 + TypeScript
- Vite (SWC)
- `@zydon/common` (Icon component + IconEnum)
- MUI 5 (required by Icon component)
- GitHub Pages + Cloudflare DNS
