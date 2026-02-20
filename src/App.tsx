import { useCallback, useEffect, useMemo, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import IconGrid from './components/IconGrid';
import type { IconMeta } from './types';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

export default function App() {
  const [icons, setIcons] = useState<IconMeta[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/icons-metadata.json')
      .then((r) => r.json())
      .then(setIcons)
      .catch(console.error);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearch(query.toLowerCase().trim());
  }, []);

  const filtered = useMemo(() => {
    let result = icons;

    if (category) {
      result = result.filter((i) => i.category === category);
    }

    if (search) {
      const terms = search.split(/\s+/);
      result = result.filter((icon) => {
        const haystack = [
          icon.enumName.toLowerCase(),
          icon.displayName.toLowerCase(),
          icon.category.toLowerCase(),
          ...icon.tags,
        ].join(' ');
        return terms.every((term) => haystack.includes(term));
      });
    }

    return result;
  }, [icons, search, category]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast(`Copied: ${text}`);
      setTimeout(() => setToast(''), 2000);
    });
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app">
        <header className="header">
          <h1>
            <span>Zydon</span> Icons
          </h1>
          <p>Browse, search, and copy all Zydon design system icons</p>
          <div className="stats">
            <span>
              <strong>{icons.length}</strong> icons
            </span>
            <span>
              <strong>{new Set(icons.map((i) => i.category)).size}</strong> categories
            </span>
            <span>
              <strong>{icons.filter((i) => i.source === 'custom').length}</strong> custom
            </span>
            <span>
              <strong>{icons.filter((i) => i.source === 'hugeicons').length}</strong> HugeIcons
            </span>
          </div>
        </header>

        <SearchBar
          onSearch={handleSearch}
          totalCount={icons.length}
          filteredCount={filtered.length}
        />

        <CategoryFilter
          icons={icons}
          selected={category}
          onSelect={setCategory}
        />

        <IconGrid icons={filtered} onCopy={handleCopy} />

        <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
      </div>
    </ThemeProvider>
  );
}
