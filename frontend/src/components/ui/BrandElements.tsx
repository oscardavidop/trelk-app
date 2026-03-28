/* ─── Signature UI Components — Trelk Visual Identity ─── */
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { BRAND, glowPulse } from '../../design';

/* ── Glow Orb: blur animated circle ── */
interface GlowOrbProps {
  color: string;
  size?: number;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const intensityMap = { low: 0.1, medium: 0.2, high: 0.35 };

export function GlowOrb({ color, size = 120, className = '', intensity = 'medium' }: GlowOrbProps) {
  return (
    <motion.div
      variants={glowPulse}
      initial="initial"
      animate="animate"
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        opacity: intensityMap[intensity],
      }}
    />
  );
}

/* ── Glass Card ── */
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}

export function GlassCard({ children, className = '', style, onClick, interactive }: GlassCardProps) {
  const Comp = interactive ? motion.div : 'div';
  const interactiveProps = interactive
    ? { whileTap: { scale: 0.97 }, whileHover: { scale: 1.01 } }
    : {};

  return (
    <Comp
      {...interactiveProps}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[${BRAND.radius.card}] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 shadow-[${BRAND.shadows.card}] ${className}`}
      style={style}
    >
      {/* Top shine */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </Comp>
  );
}

/* ── Gradient Border Card ── */
interface GradientBorderProps {
  children: ReactNode;
  gradient?: string;
  className?: string;
  borderWidth?: number;
}

export function GradientBorder({ children, gradient = 'from-tg-accent to-purple-500', className = '', borderWidth = 1 }: GradientBorderProps) {
  return (
    <div className={`relative rounded-[${BRAND.radius.card}] p-[${borderWidth}px] bg-gradient-to-br ${gradient} ${className}`}>
      <div className={`rounded-[calc(${BRAND.radius.card}-${borderWidth}px)] bg-tg-secondary overflow-hidden`}>
        {children}
      </div>
    </div>
  );
}

/* ── Category Badge ── */
interface CategoryBadgeProps {
  label: string;
  color: string;
  secondLabel?: string;
}

export function CategoryBadge({ label, color, secondLabel }: CategoryBadgeProps) {
  return (
    <span
      className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
      style={{
        color,
        backgroundColor: `${color}12`,
        border: `1px solid ${color}25`,
      }}
    >
      {label}
      {secondLabel && (
        <>
          <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
          {secondLabel}
        </>
      )}
    </span>
  );
}

/* ── Shimmer overlay for skeletons ── */
export function ShimmerOverlay({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
    </div>
  );
}
