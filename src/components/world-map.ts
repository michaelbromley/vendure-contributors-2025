// =====================================================
// WORLD MAP COMPONENT
// Interactive zoomable/pannable world map with contributor dots
// =====================================================

import type { LocationContributor, MapSvgElement, MapData, MapIndividual } from '../types';
import { MAP_CONFIG } from '../utils/constants';
import { escapeHtml, latToMercatorY } from '../utils/helpers';
import locationData from '../data/contributor-locations-geocoded.json';
import worldMapSvg from '../assets/world-map.svg?raw';

/**
 * Render the world map section HTML
 */
export function renderWorldMapHtml(): string {
  const contributors = locationData as LocationContributor[];
  const withCoords = contributors.filter(c => c.coords !== null);
  
  // Group contributors by approximate location to handle overlaps
  const locationGroups = new Map<string, LocationContributor[]>();
  withCoords.forEach(c => {
    if (!c.coords) return;
    const key = `${Math.round(c.coords.lat / 3) * 3},${Math.round(c.coords.lng / 3) * 3}`;
    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(c);
  });
  
  // Country stats for the legend
  const countryCounts: Record<string, { count: number; contributions: number }> = {};
  withCoords.forEach(c => {
    const country = c.country || 'Unknown';
    if (!countryCounts[country]) {
      countryCounts[country] = { count: 0, contributions: 0 };
    }
    countryCounts[country].count++;
    countryCounts[country].contributions += c.commitCount + c.issueCount;
  });
  
  const allCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1].count - a[1].count);
  
  const countryLegend = allCountries.map(([country, data]) => `
    <div class="country-stat">
      <span class="country-name">${escapeHtml(country)}</span>
      <span class="country-count">${data.count}</span>
    </div>
  `).join('');
  
  // Prepare map data for dots
  const mapData: MapData = {
    clusters: Array.from(locationGroups.entries()).map(([_, group]) => {
      const avgLat = group.reduce((sum, c) => sum + (c.coords?.lat || 0), 0) / group.length;
      const avgLng = group.reduce((sum, c) => sum + (c.coords?.lng || 0), 0) / group.length;
      const totalContributions = group.reduce((sum, c) => sum + c.commitCount + c.issueCount, 0);
      const names = group.slice(0, 3).map(c => escapeHtml(c.name || c.login)).join(', ') + 
                    (group.length > 3 ? ` +${group.length - 3} more` : '');
      return { 
        lat: avgLat, 
        lng: avgLng, 
        names, 
        country: escapeHtml(group[0].country || 'Unknown'), 
        count: group.length, 
        contributions: totalContributions 
      };
    }),
    individuals: withCoords.map(c => ({
      lat: c.coords?.lat || 0,
      lng: c.coords?.lng || 0,
      name: escapeHtml(c.name || c.login),
      login: escapeHtml(c.login),
      location: escapeHtml(c.location || ''),
      country: escapeHtml(c.country || ''),
      contributions: c.commitCount + c.issueCount
    }))
  };
  
  return `
    <section class="world-map-section" role="region" aria-label="Global contributor map">
      <h2>Global Community</h2>
      <p class="section-subtitle">${withCoords.length} contributors from ${Object.keys(countryCounts).length} countries</p>
      
      <div class="world-map-container">
        <div class="world-map-wrapper" id="world-map-wrapper">
          <div class="map-inner">
            <!-- Map will be loaded here -->
            <div class="map-controls-hint" aria-hidden="true">Pinch to zoom, drag to pan, double-tap to reset</div>
          </div>
        </div>
        
        <div class="map-legend" role="complementary" aria-label="Countries list">
          <h4>Countries (${allCountries.length})</h4>
          <div class="country-list" role="list">
            ${countryLegend}
          </div>
        </div>
      </div>
      
      <div id="map-dots-data" style="display:none;" aria-hidden="true">${JSON.stringify(mapData)}</div>
    </section>
  `;
}

/**
 * Convert lat/lng to SVG coordinates using Mercator projection
 */
function toSvgCoords(lat: number, lng: number): { x: number; y: number } {
  const geoLngRange = MAP_CONFIG.geoMaxLng - MAP_CONFIG.geoMinLng;
  const mercatorMaxY = latToMercatorY(MAP_CONFIG.geoMaxLat);
  const mercatorMinY = latToMercatorY(MAP_CONFIG.geoMinLat);
  const mercatorYRange = mercatorMaxY - mercatorMinY;
  
  return {
    x: ((lng - MAP_CONFIG.geoMinLng) / geoLngRange) * MAP_CONFIG.width,
    y: ((mercatorMaxY - latToMercatorY(lat)) / mercatorYRange) * MAP_CONFIG.height
  };
}

/**
 * Load and initialize the world map with interactivity
 */
export async function loadWorldMap(): Promise<void> {
  const wrapper = document.getElementById('world-map-wrapper');
  const mapInner = wrapper?.querySelector('.map-inner');
  if (!wrapper || !mapInner) return;
  
  try {
    // Parse the imported SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(worldMapSvg, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg') as MapSvgElement | null;
    
    if (!svgElement) {
      throw new Error('Failed to parse SVG');
    }
    
    svgElement.classList.add('world-map-svg');
    svgElement.setAttribute('role', 'img');
    svgElement.setAttribute('aria-label', 'Interactive world map showing contributor locations');
    
    // Add viewBox so the SVG scales properly
    const originalViewBox = { x: 0, y: 0, w: MAP_CONFIG.width, h: MAP_CONFIG.height };
    svgElement.setAttribute('viewBox', `${originalViewBox.x} ${originalViewBox.y} ${originalViewBox.w} ${originalViewBox.h}`);
    mapInner.insertBefore(svgElement, mapInner.firstChild);
    
    // Zoom and pan state
    let viewBox = { ...originalViewBox };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let viewBoxStart = { ...viewBox };
    
    // Touch state for pinch zoom
    let lastTouchDistance = 0;
    let _lastTouchCenter = { x: 0, y: 0 };
    let isTouchPanning = false;
    
    const getZoomLevel = () => originalViewBox.w / viewBox.w;
    
    const updateViewBox = () => {
      svgElement.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
      // Scale dot radii inversely to zoom so they stay the same screen size
      const zoom = getZoomLevel();
      const dots = svgElement.querySelectorAll('.map-dot, .map-dot-glow');
      dots.forEach(dot => {
        const baseR = parseFloat(dot.getAttribute('data-base-r') || dot.getAttribute('r') || '10');
        // Store base radius on first run
        if (!dot.getAttribute('data-base-r')) {
          dot.setAttribute('data-base-r', dot.getAttribute('r') || '10');
        }
        dot.setAttribute('r', (baseR / zoom).toString());
      });
      // Update cluster/individual visibility
      if (svgElement._updateDotsVisibility) {
        svgElement._updateDotsVisibility();
      }
    };
    
    const getSvgPoint = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = svgElement.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * viewBox.w + viewBox.x,
        y: ((clientY - rect.top) / rect.height) * viewBox.h + viewBox.y
      };
    };
    
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    };
    
    // Zoom with mouse wheel
    svgElement.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      const currentZoom = getZoomLevel();
      const newZoom = currentZoom / zoomFactor;
      
      if (newZoom < MAP_CONFIG.minZoom || newZoom > MAP_CONFIG.maxZoom) return;
      
      const point = getSvgPoint(e.clientX, e.clientY);
      const newW = viewBox.w * zoomFactor;
      const newH = viewBox.h * zoomFactor;
      
      // Zoom towards mouse position
      viewBox.x = point.x - (point.x - viewBox.x) * zoomFactor;
      viewBox.y = point.y - (point.y - viewBox.y) * zoomFactor;
      viewBox.w = newW;
      viewBox.h = newH;
      
      updateViewBox();
    }, { passive: false });
    
    // Pan with mouse drag
    svgElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      e.preventDefault();
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      viewBoxStart = { ...viewBox };
      svgElement.style.cursor = 'grabbing';
    });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      e.preventDefault();
      const rect = svgElement.getBoundingClientRect();
      // Convert screen delta to SVG units
      const dx = (e.clientX - panStart.x) * (viewBox.w / rect.width);
      const dy = (e.clientY - panStart.y) * (viewBox.h / rect.height);
      viewBox.x = viewBoxStart.x - dx;
      viewBox.y = viewBoxStart.y - dy;
      updateViewBox();
    };
    
    const handleMouseUp = () => {
      isPanning = false;
      svgElement.style.cursor = 'grab';
    };
    
    svgElement.addEventListener('mousemove', handleMouseMove);
    svgElement.addEventListener('mouseup', handleMouseUp);
    svgElement.addEventListener('mouseleave', handleMouseUp);
    
    // Touch events for mobile pan and pinch-zoom
    svgElement.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - start panning
        isTouchPanning = true;
        panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        viewBoxStart = { ...viewBox };
      } else if (e.touches.length === 2) {
        // Two touches - start pinch zoom
        isTouchPanning = false;
        lastTouchDistance = getTouchDistance(e.touches);
        lastTouchCenter = getTouchCenter(e.touches);
        viewBoxStart = { ...viewBox };
      }
    }, { passive: true });
    
    svgElement.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault(); // Prevent page scroll
      
      if (e.touches.length === 1 && isTouchPanning) {
        // Single touch pan
        const rect = svgElement.getBoundingClientRect();
        const dx = (e.touches[0].clientX - panStart.x) * (viewBox.w / rect.width);
        const dy = (e.touches[0].clientY - panStart.y) * (viewBox.h / rect.height);
        viewBox.x = viewBoxStart.x - dx;
        viewBox.y = viewBoxStart.y - dy;
        updateViewBox();
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const newDistance = getTouchDistance(e.touches);
        const newCenter = getTouchCenter(e.touches);
        
        if (lastTouchDistance > 0) {
          const zoomFactor = lastTouchDistance / newDistance;
          const currentZoom = getZoomLevel();
          const newZoom = currentZoom / zoomFactor;
          
          if (newZoom >= MAP_CONFIG.minZoom && newZoom <= MAP_CONFIG.maxZoom) {
            const point = getSvgPoint(newCenter.x, newCenter.y);
            const newW = viewBox.w * zoomFactor;
            const newH = viewBox.h * zoomFactor;
            
            viewBox.x = point.x - (point.x - viewBox.x) * zoomFactor;
            viewBox.y = point.y - (point.y - viewBox.y) * zoomFactor;
            viewBox.w = newW;
            viewBox.h = newH;
            
            updateViewBox();
          }
        }
        
        lastTouchDistance = newDistance;
        lastTouchCenter = newCenter;
      }
    }, { passive: false });
    
    svgElement.addEventListener('touchend', (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isTouchPanning = false;
        lastTouchDistance = 0;
      } else if (e.touches.length === 1) {
        // Switched from pinch to pan
        isTouchPanning = true;
        panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        viewBoxStart = { ...viewBox };
        lastTouchDistance = 0;
      }
    }, { passive: true });
    
    // Double-click/double-tap to reset zoom
    svgElement.addEventListener('dblclick', () => {
      viewBox = { ...originalViewBox };
      updateViewBox();
    });
    
    // Set initial cursor
    svgElement.style.cursor = 'grab';
    
    // Sync legend height with map
    const syncLegendHeight = () => {
      const legend = document.querySelector('.map-legend') as HTMLElement | null;
      if (legend && wrapper) {
        legend.style.maxHeight = `${wrapper.offsetHeight}px`;
      }
    };
    syncLegendHeight();
    window.addEventListener('resize', syncLegendHeight);
    
    // Add the dots overlay
    const dotsDataEl = document.getElementById('map-dots-data');
    if (dotsDataEl) {
      const mapData: MapData = JSON.parse(dotsDataEl.textContent || '{}');
      const clusters = mapData.clusters || [];
      const individuals = mapData.individuals || [];
      
      // Create overlay groups
      const clustersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      clustersGroup.classList.add('map-clusters');
      
      const individualsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      individualsGroup.classList.add('map-individuals');
      individualsGroup.style.opacity = '0';
      
      // Create tooltip element
      let tooltip = document.getElementById('map-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'map-tooltip';
        tooltip.className = 'map-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);
      }
      
      const showTooltip = (e: MouseEvent, content: string) => {
        if (!tooltip) return;
        tooltip.innerHTML = content;
        tooltip.style.opacity = '1';
        tooltip.style.left = `${e.pageX + 12}px`;
        tooltip.style.top = `${e.pageY - 10}px`;
      };
      
      const hideTooltip = () => {
        if (!tooltip) return;
        tooltip.style.opacity = '0';
      };
      
      const moveTooltip = (e: MouseEvent) => {
        if (!tooltip) return;
        tooltip.style.left = `${e.pageX + 12}px`;
        tooltip.style.top = `${e.pageY - 10}px`;
      };
      
      // Render cluster dots
      clusters.forEach((dot) => {
        const { x, y } = toSvgCoords(dot.lat, dot.lng);
        const baseSize = Math.min(5 + dot.count * 3, 15);
        const size = Math.min(baseSize + Math.log(dot.contributions + 1) * 2, 25);
        
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', x.toString());
        glow.setAttribute('cy', y.toString());
        glow.setAttribute('r', (size + 4).toString());
        glow.classList.add('map-dot-glow');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x.toString());
        circle.setAttribute('cy', y.toString());
        circle.setAttribute('r', size.toString());
        circle.classList.add('map-dot');
        circle.setAttribute('role', 'button');
        circle.setAttribute('aria-label', `${dot.country}: ${dot.count} contributors`);
        
        // Custom tooltip - mouse events
        circle.addEventListener('mouseenter', (e) => {
          const content = `
            <div class="tooltip-country">${dot.country}</div>
            <div class="tooltip-names">${dot.names}</div>
            <div class="tooltip-stats">
              <span class="tooltip-count">${dot.count}</span> contributors
              <span class="tooltip-dot">•</span>
              <span class="tooltip-contributions">${dot.contributions}</span> contributions
            </div>
          `;
          showTooltip(e as MouseEvent, content);
        });
        circle.addEventListener('mousemove', (e) => moveTooltip(e as MouseEvent));
        circle.addEventListener('mouseleave', hideTooltip);
        
        // Touch event for mobile
        circle.addEventListener('touchstart', (e) => {
          e.stopPropagation(); // Don't trigger map pan
          const touch = (e as TouchEvent).touches[0];
          const content = `
            <div class="tooltip-country">${dot.country}</div>
            <div class="tooltip-names">${dot.names}</div>
            <div class="tooltip-stats">
              <span class="tooltip-count">${dot.count}</span> contributors
              <span class="tooltip-dot">•</span>
              <span class="tooltip-contributions">${dot.contributions}</span> contributions
            </div>
          `;
          showTooltip({ clientX: touch.clientX, clientY: touch.clientY, pageX: touch.pageX, pageY: touch.pageY } as MouseEvent, content);
        }, { passive: true });
        
        clustersGroup.appendChild(glow);
        clustersGroup.appendChild(circle);
      });
      
      // Render individual dots (shown when zoomed in)
      // First, group individuals by their coordinates to spread out overlapping dots
      const coordGroups = new Map<string, MapIndividual[]>();
      individuals.forEach((person) => {
        const key = `${person.lat},${person.lng}`;
        if (!coordGroups.has(key)) {
          coordGroups.set(key, []);
        }
        coordGroups.get(key)!.push(person);
      });
      
      // Now render with offsets for overlapping dots
      coordGroups.forEach((people) => {
        const count = people.length;
        
        people.forEach((person, index) => {
          const { x, y } = toSvgCoords(person.lat, person.lng);
          const size = Math.min(4 + Math.log(person.contributions + 1) * 1.5, 10);
          
          // Calculate offset for overlapping dots - spread in a circle/spiral pattern
          let offsetX = 0;
          let offsetY = 0;
          
          if (count > 1) {
            // Packed spiral pattern (golden angle) - fills space like sunflower seeds
            const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
            const spacing = size * 0.13; // Tight packing based on dot size
            const angle = index * goldenAngle;
            const r = spacing * Math.sqrt(index); // Spiral outward
            offsetX = r * Math.cos(angle);
            offsetY = r * Math.sin(angle);
          }
          
          const finalX = x + offsetX;
          const finalY = y + offsetY;
          
          const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          glow.setAttribute('cx', finalX.toString());
          glow.setAttribute('cy', finalY.toString());
          glow.setAttribute('r', (size + 3).toString());
          glow.classList.add('map-dot-glow');
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', finalX.toString());
          circle.setAttribute('cy', finalY.toString());
          circle.setAttribute('r', size.toString());
          circle.classList.add('map-dot', 'map-dot-individual');
          circle.setAttribute('role', 'button');
          circle.setAttribute('aria-label', `${person.name}: ${person.contributions} contributions`);
          
          // Custom tooltip for individuals - mouse events
          circle.addEventListener('mouseenter', (e) => {
            const content = `
              <div class="tooltip-name">${person.name}</div>
              <div class="tooltip-login">@${person.login}</div>
              <div class="tooltip-location">${person.location || person.country}</div>
              <div class="tooltip-stats">
                <span class="tooltip-contributions">${person.contributions}</span> contributions
              </div>
            `;
            showTooltip(e as MouseEvent, content);
          });
          circle.addEventListener('mousemove', (e) => moveTooltip(e as MouseEvent));
          circle.addEventListener('mouseleave', hideTooltip);
          
          // Touch event for mobile
          circle.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Don't trigger map pan
            const touch = (e as TouchEvent).touches[0];
            const content = `
              <div class="tooltip-name">${person.name}</div>
              <div class="tooltip-login">@${person.login}</div>
              <div class="tooltip-location">${person.location || person.country}</div>
              <div class="tooltip-stats">
                <span class="tooltip-contributions">${person.contributions}</span> contributions
              </div>
            `;
            showTooltip({ clientX: touch.clientX, clientY: touch.clientY, pageX: touch.pageX, pageY: touch.pageY } as MouseEvent, content);
          }, { passive: true });
          
          individualsGroup.appendChild(glow);
          individualsGroup.appendChild(circle);
        });
      });
      
      svgElement.appendChild(clustersGroup);
      svgElement.appendChild(individualsGroup);
      
      // Update visibility based on zoom level
      const updateDotsVisibility = () => {
        const zoom = getZoomLevel();
        if (zoom > MAP_CONFIG.clusterZoomThreshold) {
          clustersGroup.style.opacity = '0';
          individualsGroup.style.opacity = '1';
        } else {
          clustersGroup.style.opacity = '1';
          individualsGroup.style.opacity = '0';
        }
      };
      
      // Expose for zoom updates
      svgElement._updateDotsVisibility = updateDotsVisibility;
    }
  } catch (error) {
    console.error('Failed to load world map:', error);
    if (wrapper) {
      wrapper.innerHTML = '<p style="color: #a8d8ea; text-align: center;">Failed to load map. Please try refreshing the page.</p>';
    }
  }
}
