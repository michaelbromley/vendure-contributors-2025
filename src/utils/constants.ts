// =====================================================
// CONSTANTS
// =====================================================

// Weighting: commits are worth more than issues
export const COMMIT_WEIGHT = 3;
export const ISSUE_WEIGHT = 1;

// Month names - used across the app
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Vendure brand colors
export const COLORS = {
  primary: '#17c1ff',
  primaryLight: '#5eead4',
  primaryDark: '#0d9488',
  accent: '#2dd4bf',
  accentLight: '#99f6e4',
  purple: '#a78bfa',
  purpleDark: '#7c3aed',
} as const;

// Commit type colors for donut chart
export const COMMIT_TYPE_COLORS: Record<string, string> = {
  feat: '#17c1ff',
  fix: '#f87171',
  docs: '#a78bfa',
  refactor: '#fbbf24',
  chore: '#64748b',
  test: '#34d399',
  style: '#f472b6',
  perf: '#fb923c',
  ci: '#60a5fa',
  build: '#94a3b8',
  revert: '#ef4444',
  other: '#475569'
};

// Confetti colors
export const CONFETTI_COLORS = ['#17c1ff', '#5eead4', '#0d9488', '#2dd4bf', '#99f6e4'];

// Map configuration
export const MAP_CONFIG = {
  width: 1009.6727 as number,
  height: 665.96301 as number,
  geoMinLng: -169.110266,
  geoMaxLng: 190.486279,
  geoMaxLat: 83.600842,
  geoMinLat: -58.508473,
  minZoom: 0.5,
  maxZoom: 10,
  clusterZoomThreshold: 2.5,
};
