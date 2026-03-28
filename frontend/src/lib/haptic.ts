/* ─── Standalone haptic feedback utility ─── */
/* Use in event handlers, callbacks, or anywhere outside React hooks. */

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

const hf = () => window.Telegram?.WebApp?.HapticFeedback;

export const haptic = {
  /** Tap / button press */
  tap: (style: ImpactStyle = 'light') => hf()?.impactOccurred(style),
  /** Outcome feedback (success/error/warning) */
  notify: (type: NotificationType = 'success') => hf()?.notificationOccurred(type),
  /** Selection change (picker, toggle) */
  selection: () => hf()?.selectionChanged(),
} as const;
