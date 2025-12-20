import { useEffect, useRef, useCallback } from 'react';
import type { SnowMode } from '../../App';

interface Snowflake {
  element: HTMLSpanElement;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const FLAKE_CHARS = ['❄', '❅', '❆', '✻', '✼', '❋'];

// Mode-specific settings
const SNOW_CONFIG = {
  vienna: {
    count: 60,
    sizeMin: 0.5,
    sizeMax: 1.7,
    speedMin: 0.2,
    speedMax: 0.6,
    windStrength: 0.015,
    windSpeed: 8000,
    opacityMin: 0.3,
    opacityMax: 0.8,
    mouseRadius: 100,
    mouseForce: 0.12,
  },
  kitz: {
    count: 240,
    sizeMin: 0.4,
    sizeMax: 2.2,
    speedMin: 0.5,
    speedMax: 1.4,
    windStrength: 0.06,
    windSpeed: 3000,
    opacityMin: 0.4,
    opacityMax: 0.95,
    mouseRadius: 200,
    mouseForce: 0.35,
  },
};

interface SnowflakesProps {
  mode: SnowMode;
}

export default function Snowflakes({ mode }: SnowflakesProps) {
  const config = SNOW_CONFIG[mode];
  const containerRef = useRef<HTMLDivElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  
  const animate = useCallback(() => {
    const mouseInfluenceRadius = config.mouseRadius;
    const mouseForce = config.mouseForce;
    const friction = 0.98;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Oscillating wind - wilder in kitz mode
    const time = Date.now() / config.windSpeed;
    const windVariation = Math.sin(time) * config.windStrength + Math.sin(time * 2.3) * config.windStrength * 0.5;
    
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

      // Update rotation - influenced slightly by horizontal velocity for realism
      flake.rotation += flake.rotationSpeed + flake.vx * 0.5;

      // Update DOM
      flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px) rotate(${flake.rotation}deg)`;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [config]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing
    container.innerHTML = '';
    snowflakesRef.current = [];

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Mobile adjustments: 50% count, 50% size
    const isMobile = viewportWidth < 768;
    const countMultiplier = isMobile ? 0.5 : 1;
    const sizeMultiplier = isMobile ? 0.5 : 1;
    const flakeCount = Math.floor(config.count * countMultiplier);

    // Create snowflakes
    for (let i = 0; i < flakeCount; i++) {
      const span = document.createElement('span');
      span.className = 'fixed pointer-events-none select-none';
      // Kitz mode: darker grey-blue tones visible on light bg, Vienna: white on dark bg
      span.style.color = mode === 'kitz'
        ? `hsl(210, ${15 + Math.random() * 15}%, ${50 + Math.random() * 20}%)`
        : 'white';
      span.textContent = FLAKE_CHARS[Math.floor(Math.random() * FLAKE_CHARS.length)];

      const size = (config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)) * sizeMultiplier;
      const x = Math.random() * viewportWidth;
      const y = Math.random() * viewportHeight;
      const baseVy = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      const rotation = Math.random() * 360;
      // Gentle rotation: -0.3 to 0.3 deg per frame, some clockwise some counter-clockwise
      const rotationSpeed = (Math.random() - 0.5) * 0.6;

      span.style.fontSize = `${size}rem`;
      span.style.opacity = `${config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin)}`;
      span.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
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
        size,
        rotation,
        rotationSpeed
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
  }, [animate, config, mode]);
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0" 
      aria-hidden="true"
    />
  );
}
