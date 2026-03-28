import type { CSSProperties } from 'react';

interface SkeletonBlockProps {
  className?: string;
  style?: CSSProperties;
}

/** Generic animated block with shimmer effect. */
export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return (
    <div
      className={`relative animate-pulse bg-white/5 rounded-lg overflow-hidden ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}
