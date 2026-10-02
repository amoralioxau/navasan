// =========================================================
// NAVASAN FEATURE FLAGS
// =========================================================

export const FEATURES = {
  campaign: true,
  userProfile: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key] === true;
}