// =====================================================
// SNOWFLAKES COMPONENT
// Animated falling snowflakes with mouse interaction
// =====================================================

import type { Snowflake } from '../types';

// Snowflake state
let snowflakes: Snowflake[] = [];
let mouseX = 0;
let mouseY = 0;
let animationId: number | null = null;
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

/**
 * Create snowflakes container HTML
 */
export function createSnowflakesHtml(): string {
  return `<div class="snowflakes" id="snowflakes-container" aria-hidden="true"></div>`;
}

/**
 * Initialize snowflakes with DOM elements
 */
export function initSnowflakes(): void {
  const container = document.getElementById('snowflakes-container');
  if (!container) return;
  
  // Clear existing snowflakes
  container.innerHTML = '';
  snowflakes = [];
  
  const flakeChars = ['❄', '❅', '❆', '✻', '✼', '❋'];
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  for (let i = 0; i < 60; i++) {
    const span = document.createElement('span');
    span.className = 'snowflake';
    const char = flakeChars[Math.floor(Math.random() * flakeChars.length)];
    span.textContent = char;
    
    const size = 0.5 + Math.random() * 1.2;
    const x = Math.random() * viewportWidth;
    // Distribute across viewport height initially
    const y = Math.random() * viewportHeight;
    // Slow falling speed
    const baseVy = 0.2 + Math.random() * 0.4;
    
    span.style.fontSize = `${size}rem`;
    span.style.opacity = `${0.3 + Math.random() * 0.5}`;
    
    container.appendChild(span);
    
    snowflakes.push({
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
  
  // Start animation loop
  if (animationId) cancelAnimationFrame(animationId);
  animateSnowflakes();
  
  // Setup interaction listeners
  setupSnowflakeInteractions();
}

/**
 * Setup mouse interaction for snowflakes
 */
function setupSnowflakeInteractions(): void {
  // Remove old handler if exists
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
  }
  
  // Mouse movement
  mouseMoveHandler = (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  };
  document.addEventListener('mousemove', mouseMoveHandler);
}

/**
 * Animate snowflakes - optimized for performance
 */
function animateSnowflakes(): void {
  const mouseInfluenceRadius = 100;
  const mouseForce = 0.12;
  const friction = 0.98;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Gentle wind that oscillates left AND right
  const time = Date.now() / 8000;
  const windVariation = Math.sin(time) * 0.015;
  
  // Batch all calculations first
  const updates: Array<{ flake: Snowflake; transform: string }> = [];
  
  for (const flake of snowflakes) {
    // Calculate distance from mouse (viewport coordinates)
    const dx = flake.x - mouseX;
    const dy = flake.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Mouse repulsion
    if (dist < mouseInfluenceRadius && dist > 0) {
      const force = (1 - dist / mouseInfluenceRadius) * mouseForce;
      flake.vx += (dx / dist) * force;
      flake.vy += (dy / dist) * force;
    }
    
    // Apply base falling speed (constant gentle fall)
    flake.vy += flake.baseVy * 0.05;
    
    // Apply wind
    flake.vx += windVariation;
    
    // Apply friction
    flake.vx *= friction;
    flake.vy *= friction;
    
    // Gently return to base X position to prevent permanent drift
    flake.vx += (flake.baseX - flake.x) * 0.0005;
    
    // Update position
    flake.x += flake.vx;
    flake.y += flake.vy;
    
    // Respawn at top when falling off bottom of viewport
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
    
    updates.push({
      flake,
      transform: `translate(${flake.x}px, ${flake.y}px)`
    });
  }
  
  // Batch DOM writes
  for (const { flake, transform } of updates) {
    flake.element.style.transform = transform;
  }
  
  animationId = requestAnimationFrame(animateSnowflakes);
}

/**
 * Cleanup snowflakes (call when unmounting)
 */
export function destroySnowflakes(): void {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }
  snowflakes = [];
}
