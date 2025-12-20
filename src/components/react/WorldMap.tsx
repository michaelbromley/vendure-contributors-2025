import { useEffect, useRef, useState, useMemo } from 'react';
import type { LocationContributor } from '../../types';
import locationData from '../../data/contributor-locations-geocoded.json';
import worldMapSvg from '../../assets/world-map.svg?raw';

// Inline styles for map dots
const mapStyles = {
  dot: {
    fill: '#17c1ff',
    cursor: 'pointer',
    transition: 'r 0.2s ease, filter 0.2s ease',
  },
  dotGlow: {
    fill: 'rgba(23, 193, 255, 0.3)',
    pointerEvents: 'none' as const,
  },
};

const MAP_CONFIG = {
  width: 1009.6727,
  height: 665.96301,
  geoMinLng: -169.110266,
  geoMaxLng: 190.486279,
  geoMaxLat: 83.600842,
  geoMinLat: -58.508473,
  minZoom: 0.5,
  maxZoom: 10,
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

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState({ 
    x: 0, y: 0, 
    w: MAP_CONFIG.width, 
    h: MAP_CONFIG.height 
  });
  const originalViewBox = useRef({ x: 0, y: 0, w: MAP_CONFIG.width, h: MAP_CONFIG.height });
  
  const contributors = locationData as LocationContributor[];
  const withCoords = contributors.filter(c => c.coords !== null);
  
  const { countryCounts, clusters } = useMemo(() => {
    // Group contributors by approximate location
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
    const clusters = Array.from(locationGroups.entries()).map(([_, group]) => {
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
    
    return { countryCounts, clusters };
  }, [withCoords]);
  
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1].count - a[1].count);
  
  // Load SVG map
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
    svgElement.style.cssText = 'width: 100%; height: 100%; cursor: grab;';
    
    mapInner.insertBefore(svgElement, mapInner.firstChild);
    svgRef.current = svgElement;
    
    return () => {
      svgElement.remove();
    };
  }, []);
  
  // Update viewBox
  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }, [viewBox]);
  
  // Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
    const currentZoom = originalViewBox.current.w / viewBox.w;
    const newZoom = currentZoom / zoomFactor;
    
    if (newZoom < MAP_CONFIG.minZoom || newZoom > MAP_CONFIG.maxZoom) return;
    
    setViewBox(prev => {
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
  
  // Pan handlers
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });
  
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
  
  const zoom = originalViewBox.current.w / viewBox.w;
  const dotScale = 1 / zoom;
  
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
            onWheel={handleWheel}
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
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {clusters.map((cluster, i) => {
                  const size = Math.min(5 + cluster.count * 3, 15) * dotScale;
                  return (
                    <g key={i}>
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={size + 4 * dotScale}
                        style={mapStyles.dotGlow}
                      />
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={size}
                        className="map-dot-hover pointer-events-auto"
                        style={mapStyles.dot}
                      >
                        <title>{cluster.country}: {cluster.count} contributors, {cluster.contributions} contributions</title>
                      </circle>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div className="absolute bottom-4 left-4 text-xs text-text-secondary bg-bg-dark/50 px-2 py-1 rounded">
              Scroll to zoom, drag to pan, double-click to reset
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
      </div>
    </section>
  );
}
