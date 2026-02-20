import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Injects a static icon list into the HTML for crawlers/agents
function iconCatalogPlugin() {
  return {
    name: 'inject-icon-catalog',
    transformIndexHtml(html: string) {
      try {
        const meta = JSON.parse(
          readFileSync(resolve(__dirname, 'public/icons-metadata.json'), 'utf-8')
        );
        const byCategory: Record<string, string[]> = {};
        for (const icon of meta) {
          (byCategory[icon.category] ??= []).push(icon.enumName);
        }

        const sections = Object.entries(byCategory)
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([cat, icons]) =>
            `<section><h2>${cat} (${icons.length})</h2><ul>${icons.map(n => `<li>${n}</li>`).join('')}</ul></section>`
          ).join('\n');

        const catalog = `
<div id="icon-catalog" hidden aria-hidden="true">
<h1>Common Icons — Full Catalog (${meta.length} icons)</h1>
${sections}
</div>`;

        return html.replace('<!-- BUILD_ICON_LIST placeholder — replaced by Vite plugin with full icon catalog -->', catalog);
      } catch {
        return html;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), iconCatalogPlugin()],
  base: '/',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
});
