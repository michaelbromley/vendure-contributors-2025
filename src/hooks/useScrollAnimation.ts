import { useRef, useState, useEffect, useCallback } from 'react';

// Easing functions
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}

interface UseScrollAnimationOptions {
  /** Duration in ms for the main animation (dots, counters) */
  duration?: number;
  /** Duration in ms for secondary animation (lines) - if different timing needed */
  lineDuration?: number;
  /** Threshold for IntersectionObserver (0-1) */
  threshold?: number;
  /** Easing function for main animation */
  easing?: (t: number) => number;
}

interface AnimationState {
  /** Eased progress for dots/counters (0-1) */
  progress: number;
  /** Linear progress for lines (0-1) */
  lineProgress: number;
  /** Whether animation has completed */
  isComplete: boolean;
}

/**
 * Hook for scroll-triggered animations that avoids re-renders during animation.
 * Uses refs internally and only triggers re-renders at key moments.
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    duration = 2000,
    lineDuration,
    threshold = 0.3,
    easing = easeOutCubic,
  } = options;

  const actualLineDuration = lineDuration ?? duration;

  const containerRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Use refs for animation values to avoid re-renders during animation
  const progressRef = useRef(0);
  const lineProgressRef = useRef(0);

  // Only these states trigger re-renders
  const [isVisible, setIsVisible] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>({
    progress: 0,
    lineProgress: 0,
    isComplete: false,
  });

  // Callback to force a re-render with current ref values
  const syncState = useCallback(() => {
    setAnimationState({
      progress: progressRef.current,
      lineProgress: lineProgressRef.current,
      isComplete: progressRef.current >= 1 && lineProgressRef.current >= 1,
    });
  }, []);

  // Animation frame callback
  const animate = useCallback(() => {
    if (startTimeRef.current === null) return;

    const elapsed = Date.now() - startTimeRef.current;

    // Calculate progress
    const rawProgress = Math.min(elapsed / duration, 1);
    const rawLineProgress = Math.min(elapsed / actualLineDuration, 1);

    // Apply easing to main progress
    progressRef.current = easing(rawProgress);
    lineProgressRef.current = rawLineProgress;

    // Sync state periodically (every ~100ms) instead of every frame
    // This gives smooth visuals via CSS while minimizing React re-renders
    if (elapsed % 100 < 17) { // ~60fps, trigger roughly every 100ms
      syncState();
    }

    // Continue animation or finish
    if (rawLineProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Final sync when complete
      progressRef.current = 1;
      lineProgressRef.current = 1;
      syncState();
    }
  }, [duration, actualLineDuration, easing, syncState]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, threshold]);

  // Start animation when visible
  useEffect(() => {
    if (!isVisible) return;

    startTimeRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, animate]);

  // Get current progress (for use in render)
  // Returns refs for immediate values during animation
  const getProgress = useCallback(() => progressRef.current, []);
  const getLineProgress = useCallback(() => lineProgressRef.current, []);

  return {
    containerRef,
    isVisible,
    /** Current animation state (updates periodically, not every frame) */
    ...animationState,
    /** Get immediate progress value (ref-based, no re-render) */
    getProgress,
    /** Get immediate line progress value (ref-based, no re-render) */
    getLineProgress,
  };
}
