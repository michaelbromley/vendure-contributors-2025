// =====================================================
// UTILITY FUNCTIONS
// =====================================================

import { MONTH_NAMES } from './constants';

/**
 * Escape HTML to prevent XSS attacks
 * IMPORTANT: Always use this when interpolating user data into HTML
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get month name from month index (0-11)
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month] || '';
}

/**
 * Parse commit type from conventional commit message
 */
export function getCommitType(message: string): string {
  const match = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.*?\))?:/i);
  if (match) {
    return match[1].toLowerCase();
  }
  // Check for common patterns without colon
  if (message.toLowerCase().startsWith('fix')) return 'fix';
  if (message.toLowerCase().startsWith('add')) return 'feat';
  if (message.toLowerCase().startsWith('update')) return 'chore';
  return 'other';
}

/**
 * Format a date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Safely get an element by ID with type narrowing
 */
export function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Safely query select with type narrowing
 */
export function querySelector<T extends Element>(selector: string, parent: ParentNode = document): T | null {
  return parent.querySelector(selector) as T | null;
}

/**
 * Mercator projection - convert latitude to Y coordinate
 */
export function latToMercatorY(lat: number): number {
  const latRad = lat * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}
