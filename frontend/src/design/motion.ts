/* ─── Motion System — Trelk Visual Identity ─── */
import type { Variants, Transition } from 'framer-motion';
import { BRAND } from './tokens';

/* ── Interaction presets ── */
export const MOTION = {
  tap: { scale: 0.96 },
  tapLight: { scale: 0.98 },
  hover: { scale: 1.02 },
  press: { scale: 0.94 },
} as const;

/* ── Page transition ── */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: BRAND.motion.normal, ease: BRAND.motion.easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: BRAND.motion.fast },
  },
};

/* ── Modal ── */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: BRAND.motion.normal, ease: BRAND.motion.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: BRAND.motion.fast },
  },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: BRAND.motion.fast } },
  exit: { opacity: 0, transition: { duration: BRAND.motion.fast } },
};

/* ── Stagger container ── */
export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

/* ── Stagger child (fade up) ── */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

/* ── Card entrance ── */
export const cardEntrance: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: BRAND.motion.easeOut },
  },
};

/* ── Slide horizontal (navigation) ── */
export const slideRight: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: BRAND.motion.normal, ease: BRAND.motion.easeOut },
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: BRAND.motion.fast },
  },
};

/* ── Spring transition preset ── */
export const springTransition: Transition = BRAND.motion.spring;

/* ── Glow pulse ── */
export const glowPulse: Variants = {
  initial: { opacity: 0.15 },
  animate: {
    opacity: [0.15, 0.3, 0.15],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};
