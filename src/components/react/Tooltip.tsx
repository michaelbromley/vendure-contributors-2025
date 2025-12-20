import { type ReactNode } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  safePolygon,
  useTransitionStyles,
} from '@floating-ui/react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Tooltip component using floating-ui for proper positioning and interaction handling.
 * Prevents flickering with safePolygon and handles viewport boundaries automatically.
 */
export function Tooltip({ children, content, open: controlledOpen, onOpenChange }: TooltipProps) {
  const { refs, floatingStyles, context } = useFloating({
    open: controlledOpen,
    onOpenChange,
    placement: 'top',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: 'start',
        crossAxis: false,
      }),
      shift({ padding: 10 }),
    ],
  });

  const hover = useHover(context, {
    move: false,
    // safePolygon creates a "safe zone" polygon between reference and floating
    // This prevents flickering when moving mouse from element to tooltip
    handleClose: safePolygon({
      blockPointerEvents: true,
    }),
    delay: { open: 100, close: 0 },
  });

  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 150,
    initial: {
      opacity: 0,
      transform: 'scale(0.95)',
    },
  });

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()} className="inline-block">
        {children}
      </div>
      {isMounted && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              ...transitionStyles,
              zIndex: 10000,
              maxWidth: 'min(320px, calc(100vw - 20px))',
            }}
            {...getFloatingProps()}
          >
            <div className="bg-bg-dark/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-3 text-sm">
              {content}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

/**
 * Controlled tooltip that can be shown/hidden programmatically.
 * Used for cases where you need to control tooltip visibility based on mouse position.
 */
interface ControlledTooltipProps {
  x: number;
  y: number;
  children: ReactNode;
}

export default function ControlledTooltip({ x, y, children }: ControlledTooltipProps) {
  const { refs, floatingStyles, context } = useFloating({
    open: true,
    placement: 'right-start',
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift({ padding: 10 }),
    ],
  });

  const { styles: transitionStyles } = useTransitionStyles(context, {
    duration: 150,
    initial: {
      opacity: 0,
      transform: 'scale(0.95)',
    },
  });

  return (
    <FloatingPortal>
      {/* Virtual reference element positioned at cursor */}
      <div
        ref={refs.setReference}
        style={{
          position: 'fixed',
          left: x,
          top: y,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          ...transitionStyles,
          zIndex: 10000,
          maxWidth: 'min(320px, calc(100vw - 20px))',
          pointerEvents: 'none',
        }}
      >
        <div className="bg-bg-dark/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-3 text-sm">
          {children}
        </div>
      </div>
    </FloatingPortal>
  );
}
