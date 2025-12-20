import { useEffect, useRef, useCallback } from 'react';

interface Snowflake {
  element: HTMLSpanElement;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
}

const FLAKE_CHARS = ['❄', '❅', '❆', '✻', '✼', '❋'];
const SNOWFLAKE_COUNT = 60;

export default function Snowflakes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  
  const animate = useCallback(() => {
    const mouseInfluenceRadius = 100;
    const mouseForce = 0.12;
    const friction = 0.98;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Gentle oscillating wind
    const time = Date.now() / 8000;
    const windVariation = Math.sin(time) * 0.015;
    
    for (const flake of snowflakesRef.current) {
      // Calculate distance from mouse
      const dx = flake.x - mouseRef.current.x;
      const dy = flake.y - mouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Mouse repulsion
      if (dist < mouseInfluenceRadius && dist > 0) {
        const force = (1 - dist / mouseInfluenceRadius) * mouseForce;
        flake.vx += (dx / dist) * force;
        flake.vy += (dy / dist) * force;
      }
      
      // Apply base falling speed
      flake.vy += flake.baseVy * 0.05;
      
      // Apply wind
      flake.vx += windVariation;
      
      // Apply friction
      flake.vx *= friction;
      flake.vy *= friction;
      
      // Gently return to base X position
      flake.vx += (flake.baseX - flake.x) * 0.0005;
      
      // Update position
      flake.x += flake.vx;
      flake.y += flake.vy;
      
      // Respawn at top when falling off bottom
      if (flake.y > viewportHeight + 20) {
        flake.y = -20;
        flake.x = Math.random() * viewportWidth;
        flake.baseX = flake.x;
        flake.vx = 0;
        flake.vy = flake.baseVy;
      }
      
      // Wrap horizontally
      if (flake.x < -20) {
        flake.x = viewportWidth + 20;
        flake.baseX = flake.x;
      }
      if (flake.x > viewportWidth + 20) {
        flake.x = -20;
        flake.baseX = flake.x;
      }
      
      // Update DOM
      flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    snowflakesRef.current = [];
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Create snowflakes
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      const span = document.createElement('span');
      span.className = 'fixed pointer-events-none text-white select-none';
      span.textContent = FLAKE_CHARS[Math.floor(Math.random() * FLAKE_CHARS.length)];
      
      const size = 0.5 + Math.random() * 1.2;
      const x = Math.random() * viewportWidth;
      const y = Math.random() * viewportHeight;
      const baseVy = 0.2 + Math.random() * 0.4;
      
      span.style.fontSize = `${size}rem`;
      span.style.opacity = `${0.3 + Math.random() * 0.5}`;
      span.style.transform = `translate(${x}px, ${y}px)`;
      span.style.willChange = 'transform';
      
      container.appendChild(span);
      
      snowflakesRef.current.push({
        element: span,
        x,
        y,
        baseX: x,
        vx: 0,
        vy: baseVy,
        baseVy,
        size
      });
    }
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [animate]);
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0" 
      aria-hidden="true"
    />
  );
}
