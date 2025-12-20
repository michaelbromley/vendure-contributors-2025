import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { LocationContributor } from '../../types';
import locationData from '../../data/contributor-locations-geocoded.json';
import worldMapSvg from '../../assets/world-map.svg?raw';
import {
  useFloating,
  offset,
  flip,
  shift,
  FloatingPortal,
  autoUpdate,
} from '@floating-ui/react';
import { useSnowMode } from '../../App';

// Inline styles for map dots - returns theme-aware styles
const getMapStyles = (isKitz: boolean) => ({
  clusterDot: {
    fill: isKitz ? 'rgba(20, 184, 198, 0.7)' : 'rgba(23, 193, 255, 0.6)',
    cursor: 'pointer',
    transition: 'filter 0.2s ease',
  },
  individualDot: {
    fill: isKitz ? '#14b8c6' : '#17c1ff',
    cursor: 'pointer',
    transition: 'filter 0.2s ease',
  },
  dotGlow: {
    fill: isKitz ? 'rgba(20, 184, 198, 0.25)' : 'rgba(23, 193, 255, 0.2)',
    pointerEvents: 'none' as const,
  },
});

interface ClusterTooltipData {
  type: 'cluster';
  names: string;
  country: string;
  count: number;
  contributions: number;
}

interface IndividualTooltipData {
  type: 'individual';
  name: string;
  login: string;
  location: string;
  contributions: number;
}

type TooltipData = ClusterTooltipData | IndividualTooltipData;

const MAP_CONFIG = {
  width: 1009.6727,
  height: 665.96301,
  geoMinLng: -169.110266,
  geoMaxLng: 190.486279,
  geoMaxLat: 83.600842,
  geoMinLat: -58.508473,
  minZoom: 1,
  maxZoom: 25,
  clusterZoomThreshold: 2.5,
};

function latToMercatorY(lat: number): number {
  const latRad = lat * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

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

interface Cluster {
  lat: number;
  lng: number;
  x: number;
  y: number;
  names: string;
  country: string;
  count: number;
  contributions: number;
}

interface Individual {
  lat: number;
  lng: number;
  x: number;
  y: number;
  name: string;
  login: string;
  location: string;
  country: string;
  contributions: number;
}

export default function WorldMap() {
  const { mode } = useSnowMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState({
    x: 0, y: 0,
    w: MAP_CONFIG.width,
    h: MAP_CONFIG.height
  });
  const originalViewBox = useRef({ x: 0, y: 0, w: MAP_CONFIG.width, h: MAP_CONFIG.height });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const isTooltipHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: !!tooltip,
    placement: 'top',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const contributors = locationData as LocationContributor[];
  const withCoords = contributors.filter(c => c.coords !== null);

  // Calculate zoom level
  const zoom = originalViewBox.current.w / viewBox.w;
  const showIndividuals = zoom > MAP_CONFIG.clusterZoomThreshold;

  // Scale dots inversely with zoom so they stay same screen size
  const dotScale = 1 / zoom;

  // Theme-aware dot styles
  const mapStyles = useMemo(() => getMapStyles(mode === 'kitz'), [mode]);

  const { countryCounts, clusters, individuals } = useMemo(() => {
    // Group contributors by approximate location for clusters
    const locationGroups = new Map<string, LocationContributor[]>();
    withCoords.forEach(c => {
      if (!c.coords) return;
      const key = `${Math.round(c.coords.lat / 3) * 3},${Math.round(c.coords.lng / 3) * 3}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)!.push(c);
    });

    // Country stats
    const countryCounts: Record<string, { count: number; contributions: number }> = {};
    withCoords.forEach(c => {
      const country = c.country || 'Unknown';
      if (!countryCounts[country]) {
        countryCounts[country] = { count: 0, contributions: 0 };
      }
      countryCounts[country].count++;
      countryCounts[country].contributions += c.commitCount + c.issueCount;
    });

    // Create clusters
    const clusters: Cluster[] = Array.from(locationGroups.entries()).map(([_, group]) => {
      const avgLat = group.reduce((sum, c) => sum + (c.coords?.lat || 0), 0) / group.length;
      const avgLng = group.reduce((sum, c) => sum + (c.coords?.lng || 0), 0) / group.length;
      const totalContributions = group.reduce((sum, c) => sum + c.commitCount + c.issueCount, 0);
      const names = group.slice(0, 3).map(c => c.name || c.login).join(', ') +
        (group.length > 3 ? ` +${group.length - 3} more` : '');
      return {
        lat: avgLat,
        lng: avgLng,
        names,
        country: group[0].country || 'Unknown',
        count: group.length,
        contributions: totalContributions,
        ...toSvgCoords(avgLat, avgLng)
      };
    });

    // Create individuals with spiral offset for overlapping dots
    const coordGroups = new Map<string, LocationContributor[]>();
    withCoords.forEach(c => {
      if (!c.coords) return;
      const key = `${c.coords.lat},${c.coords.lng}`;
      if (!coordGroups.has(key)) {
        coordGroups.set(key, []);
      }
      coordGroups.get(key)!.push(c);
    });

    const individuals: Individual[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

    coordGroups.forEach((people) => {
      const count = people.length;

      people.forEach((person, index) => {
        if (!person.coords) return;
        const { x, y } = toSvgCoords(person.coords.lat, person.coords.lng);
        const contributions = person.commitCount + person.issueCount;
        const size = Math.min(4 + Math.log(contributions + 1) * 1.5, 10);

        // Calculate offset for overlapping dots - golden angle spiral pattern
        let offsetX = 0;
        let offsetY = 0;

        if (count > 1) {
          const spacing = size * 0.13; // Tight packing based on dot size
          const angle = index * goldenAngle;
          const r = spacing * Math.sqrt(index); // Spiral outward
          offsetX = r * Math.cos(angle);
          offsetY = r * Math.sin(angle);
        }

        individuals.push({
          lat: person.coords.lat,
          lng: person.coords.lng,
          x: x + offsetX,
          y: y + offsetY,
          name: person.name || person.login,
          login: person.login,
          location: person.location || '',
          country: person.country || 'Unknown',
          contributions,
        });
      });
    });

    return { countryCounts, clusters, individuals };
  }, [withCoords]);

  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1].count - a[1].count);

  // Load SVG map with country styles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mapInner = container.querySelector('.map-inner');
    if (!mapInner) return;

    // Parse and insert SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(worldMapSvg, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (!svgElement) return;

    svgElement.classList.add('world-map-svg');
    svgElement.setAttribute('role', 'img');
    svgElement.setAttribute('aria-label', 'Interactive world map showing contributor locations');
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgElement.style.cssText = 'width: 100%; height: 100%; cursor: grab;';

    // Style country paths with faint borders and hover effects
    // Theme-aware colors
    const isKitz = mode === 'kitz';
    const baseFill = isKitz ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)';
    const baseStroke = isKitz ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)';
    const hoverFill = isKitz ? 'rgba(14, 116, 144, 0.15)' : 'rgba(23, 193, 255, 0.1)';
    const hoverStroke = isKitz ? 'rgba(14, 116, 144, 0.4)' : 'rgba(23, 193, 255, 0.3)';

    const paths = svgElement.querySelectorAll('path');
    paths.forEach(path => {
      path.style.fill = baseFill;
      path.style.stroke = baseStroke;
      path.style.strokeWidth = '0.5';
      path.style.transition = 'fill 0.2s ease, stroke 0.2s ease';

      path.addEventListener('mouseenter', () => {
        path.style.fill = hoverFill;
        path.style.stroke = hoverStroke;
      });
      path.addEventListener('mouseleave', () => {
        path.style.fill = baseFill;
        path.style.stroke = baseStroke;
      });
    });

    mapInner.insertBefore(svgElement, mapInner.firstChild);
    svgRef.current = svgElement;

    return () => {
      svgElement.remove();
    };
  }, [mode]);

  // Update viewBox
  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }, [viewBox]);

  // Zoom handler - use native event listener to prevent page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;

      setViewBox(prev => {
        const currentZoom = originalViewBox.current.w / prev.w;
        const newZoom = currentZoom / zoomFactor;

        if (newZoom < MAP_CONFIG.minZoom || newZoom > MAP_CONFIG.maxZoom) return prev;

        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return prev;

        const mouseX = ((e.clientX - rect.left) / rect.width) * prev.w + prev.x;
        const mouseY = ((e.clientY - rect.top) / rect.height) * prev.h + prev.y;

        const newW = prev.w * zoomFactor;
        const newH = prev.h * zoomFactor;

        return {
          x: mouseX - (mouseX - prev.x) * zoomFactor,
          y: mouseY - (mouseY - prev.y) * zoomFactor,
          w: newW,
          h: newH
        };
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch handlers for mobile pan and pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isTouching = false;
    let isPinching = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartViewX = 0;
    let touchStartViewY = 0;
    let lastTapTime = 0;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger - start pan
        isTouching = true;
        isPinching = false;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        setViewBox(prev => {
          touchStartViewX = prev.x;
          touchStartViewY = prev.y;
          return prev;
        });
      } else if (e.touches.length === 2) {
        // Two fingers - start pinch
        e.preventDefault();
        isTouching = false;
        isPinching = true;
        const distance = getDistance(e.touches[0], e.touches[1]);
        const center = getCenter(e.touches[0], e.touches[1]);
        setViewBox(prev => {
          pinchStart.current = {
            distance,
            viewBox: { ...prev },
            centerX: center.x,
            centerY: center.y,
          };
          return prev;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouching && e.touches.length === 1) {
        // Single finger pan
        const touch = e.touches[0];
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        setViewBox(prev => {
          const dx = (touch.clientX - touchStartX) * (prev.w / rect.width);
          const dy = (touch.clientY - touchStartY) * (prev.h / rect.height);
          return { ...prev, x: touchStartViewX - dx, y: touchStartViewY - dy };
        });
      } else if (isPinching && e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = pinchStart.current.distance / currentDistance;

        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const { viewBox: startVB, centerX, centerY } = pinchStart.current;

        // Calculate pinch center in SVG coordinates
        const svgCenterX = ((centerX - rect.left) / rect.width) * startVB.w + startVB.x;
        const svgCenterY = ((centerY - rect.top) / rect.height) * startVB.h + startVB.y;

        const newW = startVB.w * scale;
        const newH = startVB.h * scale;

        // Check zoom limits
        const newZoom = originalViewBox.current.w / newW;
        if (newZoom < MAP_CONFIG.minZoom || newZoom > MAP_CONFIG.maxZoom) return;

        setViewBox({
          x: svgCenterX - (svgCenterX - startVB.x) * scale,
          y: svgCenterY - (svgCenterY - startVB.y) * scale,
          w: newW,
          h: newH,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Double-tap detection for reset
      if (e.touches.length === 0 && !isPinching) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          // Double tap - reset view
          setViewBox({ ...originalViewBox.current });
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
      isTouching = false;
      isPinching = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Pan handlers
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });
  const pinchStart = useRef({ distance: 0, viewBox: { x: 0, y: 0, w: 0, h: 0 }, centerX: 0, centerY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, viewX: viewBox.x, viewY: viewBox.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - panStart.current.x) * (viewBox.w / rect.width);
    const dy = (e.clientY - panStart.current.y) * (viewBox.h / rect.height);
    setViewBox(prev => ({ ...prev, x: panStart.current.viewX - dx, y: panStart.current.viewY - dy }));
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleDoubleClick = () => {
    setViewBox({ ...originalViewBox.current });
  };

  // Tooltip handlers
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isTooltipHoveredRef.current) {
        setTooltip(null);
      }
    }, 150);
  }, [clearHideTimeout]);

  const handleClusterEnter = useCallback((cluster: Cluster, element: SVGElement) => {
    clearHideTimeout();
    refs.setReference(element as unknown as HTMLElement);
    setTooltip({
      type: 'cluster',
      names: cluster.names,
      country: cluster.country,
      count: cluster.count,
      contributions: cluster.contributions,
    });
  }, [refs, clearHideTimeout]);

  const handleIndividualEnter = useCallback((individual: Individual, element: SVGElement) => {
    clearHideTimeout();
    refs.setReference(element as unknown as HTMLElement);
    setTooltip({
      type: 'individual',
      name: individual.name,
      login: individual.login,
      location: individual.location || individual.country,
      contributions: individual.contributions,
    });
  }, [refs, clearHideTimeout]);

  const handleDotLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleTooltipEnter = useCallback(() => {
    clearHideTimeout();
    isTooltipHoveredRef.current = true;
  }, [clearHideTimeout]);

  const handleTooltipLeave = useCallback(() => {
    isTooltipHoveredRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  return (
    <section className="py-12 px-4" role="region" aria-label="Global contributor map">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gradient">
          Global Community
        </h2>
        <p className="text-text-secondary text-center mb-8">
          {withCoords.length} contributors from {Object.keys(countryCounts).length} countries
        </p>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Map */}
          <div
            ref={containerRef}
            className="glass-card flex-1 min-h-[300px] md:min-h-[400px] lg:min-h-[500px] relative overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            <div className="map-inner absolute inset-0">
              <style>{`
                .map-dot-hover:hover { filter: brightness(1.3); }
              `}</style>

              {/* SVG map inserted here by useEffect */}

              {/* Contributor dots overlay */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Clusters - shown when zoomed out */}
                <g style={{ opacity: showIndividuals ? 0 : 1, transition: 'opacity 0.3s ease' }}>
                  {clusters.map((cluster, i) => {
                    const baseSize = Math.min(5 + cluster.count * 3, 15);
                    const size = Math.min(baseSize + Math.log(cluster.contributions + 1) * 2, 25) * dotScale;
                    const glowSize = size + 4 * dotScale;

                    return (
                      <g key={`cluster-${i}`}>
                        <circle
                          cx={cluster.x}
                          cy={cluster.y}
                          r={glowSize}
                          style={mapStyles.dotGlow}
                        />
                        <circle
                          cx={cluster.x}
                          cy={cluster.y}
                          r={size}
                          className="map-dot-hover pointer-events-auto"
                          style={mapStyles.clusterDot}
                          onMouseEnter={(e) => handleClusterEnter(cluster, e.currentTarget)}
                          onMouseLeave={handleDotLeave}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Individuals - shown when zoomed in */}
                <g style={{ opacity: showIndividuals ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  {individuals.map((individual, i) => {
                    const size = Math.min(4 + Math.log(individual.contributions + 1) * 1.5, 10) * dotScale;
                    const glowSize = size + 3 * dotScale;

                    return (
                      <g key={`individual-${i}`}>
                        <circle
                          cx={individual.x}
                          cy={individual.y}
                          r={glowSize}
                          style={mapStyles.dotGlow}
                        />
                        <circle
                          cx={individual.x}
                          cy={individual.y}
                          r={size}
                          className="map-dot-hover pointer-events-auto"
                          style={mapStyles.individualDot}
                          onMouseEnter={(e) => handleIndividualEnter(individual, e.currentTarget)}
                          onMouseLeave={handleDotLeave}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="absolute bottom-4 left-4 text-xs text-text-secondary bg-bg-dark/50 px-2 py-1 rounded hidden md:block">
              Scroll to zoom, drag to pan, double-click to reset
            </div>
            <div className="absolute bottom-4 left-4 text-xs text-text-secondary bg-bg-dark/50 px-2 py-1 rounded md:hidden">
              Pinch to zoom, drag to pan, double-tap to reset
            </div>
          </div>

          {/* Country list */}
          <div className="glass-card p-4 lg:w-64 max-h-[400px] lg:max-h-[500px] overflow-hidden flex flex-col">
            <h4 className="font-semibold text-text-primary mb-3">
              Countries ({sortedCountries.length})
            </h4>
            <div className="overflow-y-auto flex-1 -mr-2 pr-2">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {sortedCountries.map(([country, data]) => (
                  <div key={country} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate mr-2">{country}</span>
                    <span className="text-vendure-primary font-medium flex-shrink-0">{data.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating tooltip */}
        {tooltip && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 10000,
                maxWidth: 'min(280px, calc(100vw - 20px))',
              }}
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >
              <div className="bg-bg-dark/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-3 text-sm">
                {tooltip.type === 'cluster' ? (
                  <>
                    <div className="text-white font-medium">{tooltip.country}</div>
                    <div className="text-text-secondary mt-1">
                      <span className="text-vendure-primary font-semibold">{tooltip.count}</span> contributor{tooltip.count !== 1 ? 's' : ''}
                    </div>
                    <div className="text-text-secondary">
                      <span className="text-vendure-primary font-semibold">{tooltip.contributions}</span> contribution{tooltip.contributions !== 1 ? 's' : ''}
                    </div>
                    <div className="text-text-muted text-xs mt-2 border-t border-white/10 pt-2">
                      {tooltip.names}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-white font-medium">{tooltip.name}</div>
                    <div className="text-vendure-primary text-xs">@{tooltip.login}</div>
                    <div className="text-text-muted text-xs mt-1">{tooltip.location}</div>
                    <div className="text-text-secondary mt-2 border-t border-white/10 pt-2">
                      <span className="text-vendure-primary font-semibold">{tooltip.contributions}</span> contribution{tooltip.contributions !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>
            </div>
          </FloatingPortal>
        )}
      </div>
    </section>
  );
}
