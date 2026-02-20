import { memo } from 'react';
import Icon, { IconEnum } from '@zydon/common/components/Icon';
import type { IconMeta } from '../types';

interface IconCardProps {
  icon: IconMeta;
  onCopy: (text: string) => void;
}

const IconCard = memo(function IconCard({ icon, onCopy }: IconCardProps) {
  const enumKey = icon.enumName as keyof typeof IconEnum;
  const isValidIcon = enumKey in IconEnum;

  return (
    <div
      className="icon-card"
      onClick={() => onCopy(`IconEnum.${icon.enumName}`)}
      title={`${icon.displayName}\nCategory: ${icon.category}\nTags: ${icon.tags.join(', ')}\n\nClick to copy: IconEnum.${icon.enumName}`}
    >
      <div className="icon-render">
        {isValidIcon ? (
          <Icon icon={enumKey} width={28} height={28} />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>?</span>
        )}
      </div>
      <div className="icon-name">{icon.enumName}</div>
      <div className="icon-source">{icon.source}</div>
    </div>
  );
});

export default IconCard;
