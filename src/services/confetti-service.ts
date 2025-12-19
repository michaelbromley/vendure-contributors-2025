// =====================================================
// CONFETTI SERVICE
// Handles celebration effects
// =====================================================

import confetti from 'canvas-confetti';
import { CONFETTI_COLORS } from '../utils/constants';

/**
 * Launch celebration confetti
 */
export function launchConfetti(): void {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: CONFETTI_COLORS
  });
  
  // Fire from both sides
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: CONFETTI_COLORS
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: CONFETTI_COLORS
    });
  }, 200);
}
