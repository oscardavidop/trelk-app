import confetti from 'canvas-confetti';
import { haptic } from './haptic';

/* ═══════════════════════════════════════════════
 *  🎉 Confetti Effects
 * ═══════════════════════════════════════════════ */

export function celebrateConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'],
    disableForReducedMotion: true,
  });
  haptic.notify('success');
}

export function celebrateConfettiSubtle() {
  confetti({
    particleCount: 36,
    spread: 52,
    startVelocity: 17,
    gravity: 1.05,
    scalar: 0.92,
    ticks: 130,
    origin: { y: 0.72 },
    colors: ['#10b981', '#22c55e', '#38bdf8', '#f59e0b'],
    disableForReducedMotion: true,
  });
  haptic.notify('success');
}

export function smallConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    startVelocity: 20,
    origin: { y: 0.8 },
    disableForReducedMotion: true,
  });
  haptic.tap('medium');
}

/* ═══════════════════════════════════════════════
 *  ✨ Glow pulse via CSS class toggle
 * ═══════════════════════════════════════════════ */

export function glowElement(el: HTMLElement | null, durationMs = 800) {
  if (!el) return;
  el.classList.add('delight-glow');
  setTimeout(() => el.classList.remove('delight-glow'), durationMs);
}

/* ═══════════════════════════════════════════════
 *  📳 Enhanced Haptics
 * ═══════════════════════════════════════════════ */

export const delightHaptic = {
  success: () => haptic.notify('success'),
  like: () => haptic.tap('light'),
  error: () => haptic.notify('error'),
  warning: () => haptic.notify('warning'),
  achievement: () => {
    haptic.notify('success');
    // double tap for extra delight
    setTimeout(() => haptic.tap('heavy'), 150);
  },
  levelUp: () => {
    haptic.tap('heavy');
    setTimeout(() => haptic.notify('success'), 100);
  },
} as const;
