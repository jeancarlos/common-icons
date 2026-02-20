import type { IconMeta } from '../types';

interface CategoryFilterProps {
  icons: IconMeta[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryFilter({ icons, selected, onSelect }: CategoryFilterProps) {
  // Count icons per category
  const counts = new Map<string, number>();
  for (const icon of icons) {
    counts.set(icon.category, (counts.get(icon.category) || 0) + 1);
  }

  // Sort by count descending
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="category-filter">
      <button
        className={`category-chip ${selected === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All<span className="count">{icons.length}</span>
      </button>
      {categories.map(([cat, count]) => (
        <button
          key={cat}
          className={`category-chip ${selected === cat ? 'active' : ''}`}
          onClick={() => onSelect(selected === cat ? null : cat)}
        >
          {cat}<span className="count">{count}</span>
        </button>
      ))}
    </div>
  );
}
