// =====================================================
// LIGHTS COMPONENT
// Twinkling festive lights at the top of the page
// =====================================================

/**
 * Create festive lights HTML
 */
export function createLightsHtml(): string {
  return `
    <div class="lights" aria-hidden="true">
      ${Array(12).fill('<span class="light"></span>').join('')}
    </div>
  `;
}
