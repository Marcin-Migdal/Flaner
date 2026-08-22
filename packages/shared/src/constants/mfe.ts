export const MFE_NAMES = {
  SETTINGS: 'settings',
  COMMUNITY: 'community',
  SHOPPING: 'shopping',
  PLANNING: 'planning',
} as const;

export type MfeName = typeof MFE_NAMES[keyof typeof MFE_NAMES];
