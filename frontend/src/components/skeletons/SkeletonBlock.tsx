import type { CSSProperties } from 'react';

interface SkeletonBlockProps {
  className?: string;
  style?: CSSProperties;
}

/** Generic animated block — use width/height classes from parent. */
export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded-lg ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
