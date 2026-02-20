import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function SearchBar({ onSearch, totalCount, filteredCount }: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value), 200);
    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  const showing = value || filteredCount !== totalCount
    ? `Showing ${filteredCount} of ${totalCount}`
    : `${totalCount} icons`;

  return (
    <div className="search-container">
      <input
        className="search-input"
        type="text"
        placeholder={`Search ${totalCount} icons by name, tag, or category...`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
        {showing}
      </div>
    </div>
  );
}
