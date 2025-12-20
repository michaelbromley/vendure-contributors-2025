import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  x: number;
  y: number;
  children: ReactNode;
}

export default function Tooltip({ x, y, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x + 15, top: y - 10 });
  
  useEffect(() => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x + 15;
    let top = y - 10;
    
    // Adjust if tooltip would go off right edge
    if (left + rect.width > viewportWidth - 20) {
      left = x - rect.width - 15;
    }
    
    // Adjust if tooltip would go off bottom edge
    if (top + rect.height > viewportHeight - 20) {
      top = y - rect.height - 10;
    }
    
    // Ensure not off top or left edge
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    setPosition({ left, top });
  }, [x, y]);
  
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[10000] pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ left: position.left, top: position.top }}
      role="tooltip"
    >
      <div className="bg-bg-dark/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-3 text-sm">
        {children}
      </div>
    </div>,
    document.body
  );
}
