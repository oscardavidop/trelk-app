/**
 * Feature of the Day — editorial content.
 * Rotates daily based on Date. Add more entries for longer rotations.
 */
export interface Feature {
  id: string;
  titleKey: string;
  descKey: string;
  /** Route to navigate on CTA tap (relative to user base) */
  route: string;
}

export const FEATURES: Feature[] = [
  {
    id: 'inline_mode',
    titleKey: 'feature_inline_title',
    descKey: 'feature_inline_desc',
    route: '/bot-commands',
  },
  {
    id: 'feedback',
    titleKey: 'feature_feedback_title',
    descKey: 'feature_feedback_desc',
    route: '/bot-commands',
  },
  {
    id: 'collections',
    titleKey: 'feature_collections_title',
    descKey: 'feature_collections_desc',
    route: '/favorites',
  },
  {
    id: 'alerts',
    titleKey: 'feature_alerts_title',
    descKey: 'feature_alerts_desc',
    route: '/alerts',
  },
  {
    id: 'achievements',
    titleKey: 'feature_achievements_title',
    descKey: 'feature_achievements_desc',
    route: '/achievements',
  },
];

/** Deterministic daily rotation — same feature all day */
export function getFeatureOfTheDay(): Feature {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return FEATURES[dayIndex % FEATURES.length];
}
