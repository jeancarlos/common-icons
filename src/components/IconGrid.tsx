import type { IconMeta } from '../types';
import IconCard from './IconCard';

interface IconGridProps {
  icons: IconMeta[];
  onCopy: (text: string) => void;
}

export default function IconGrid({ icons, onCopy }: IconGridProps) {
  if (icons.length === 0) {
    return (
      <div className="empty-state">
        <p>No icons match your search</p>
        <span>Try a different keyword or clear the filter</span>
      </div>
    );
  }

  return (
    <div className="icon-grid">
      {icons.map((icon) => (
        <IconCard key={icon.enumName} icon={icon} onCopy={onCopy} />
      ))}
    </div>
  );
}
