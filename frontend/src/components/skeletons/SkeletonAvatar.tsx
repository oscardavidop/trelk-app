import type { CSSProperties } from 'react';
import { SkeletonBlock } from './SkeletonBlock';

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

/** Round avatar skeleton. */
export function SkeletonAvatar({ size = 40, className = '' }: SkeletonAvatarProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <SkeletonBlock
      className={`rounded-full shrink-0 ${className}`}
      style={style}
    />
  );
}
