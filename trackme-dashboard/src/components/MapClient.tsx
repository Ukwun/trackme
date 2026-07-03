"use client";

import { useEffect, useRef } from "react";

export interface MapLocation {
  deviceId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp?: number;
}

export interface MapProps {
  locations: MapLocation[];
  selectedUnit?: MapLocation | null;
  trails?: Record<string, Array<[number, number]>>;
}

function statusColor(loc: MapLocation): string {
  if (loc.battery != null && loc.battery < 25) return "#ef4444";
  if (loc.speed != null && loc.speed > 0) return "#22c55e";
  return "#06b6d4";
}

export default function MapClient({ locations, selectedUnit, trails = {} }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylinesRef = useRef<Record<string, any>>({});

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Leaflet must be required at runtime (browser only)
    const L = require("leaflet") as typeof import("leaflet");

    // Fix default icon paths that webpack breaks
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center: [6.5244, 3.3792],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      polylinesRef.current = {};
    };
  }, []);

  // Update markers and trails whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const L = require("leaflet") as typeof import("leaflet");

    // ---- Update trails (polylines) ----
    const activeTrailIds = new Set(Object.keys(trails));

    // Remove stale polylines
    for (const id of Object.keys(polylinesRef.current)) {
      if (!activeTrailIds.has(id)) {
        polylinesRef.current[id].remove();
        delete polylinesRef.current[id];
      }
    }

    // Add / update polylines
    for (const [deviceId, trail] of Object.entries(trails)) {
      if (!trail || trail.length < 2) continue;
      const latlngs = trail.map(([lng, lat]) => [lat, lng] as [number, number]);
      const isSelected = selectedUnit?.deviceId === deviceId;

      if (polylinesRef.current[deviceId]) {
        polylinesRef.current[deviceId].setLatLngs(latlngs);
        polylinesRef.current[deviceId].setStyle({
          color: isSelected ? "#06b6d4" : "#8b5cf6",
          weight: isSelected ? 4 : 3,
        });
      } else {
        polylinesRef.current[deviceId] = L.polyline(latlngs, {
          color: isSelected ? "#06b6d4" : "#8b5cf6",
          weight: isSelected ? 4 : 3,
          opacity: 0.75,
        }).addTo(map);
      }
    }

    // ---- Update device markers ----
    const activeDeviceIds = new Set(locations.map((l) => l.deviceId));

    // Remove stale markers
    for (const id of Object.keys(markersRef.current)) {
      if (!activeDeviceIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    // Add / update markers
    for (const loc of locations) {
      const isSelected = loc.deviceId === selectedUnit?.deviceId;
      const color = statusColor(loc);
      const radius = isSelected ? 10 : 7;

      const popupHtml = `
        <div style="font-size:12px;line-height:1.5">
          <div style="font-weight:600">Device: ${loc.deviceId}</div>
          <div>Lat: ${loc.lat.toFixed(6)}</div>
          <div>Lng: ${loc.lng.toFixed(6)}</div>
          ${loc.speed != null ? `<div>Speed: ${loc.speed} km/h</div>` : ""}
          ${loc.heading != null ? `<div>Heading: ${loc.heading}°</div>` : ""}
          ${loc.battery != null ? `<div>Battery: ${loc.battery}%</div>` : ""}
        </div>`;

      if (markersRef.current[loc.deviceId]) {
        markersRef.current[loc.deviceId].setLatLng([loc.lat, loc.lng]);
        markersRef.current[loc.deviceId].setStyle({ color: "#0f172a", fillColor: color, radius });
        markersRef.current[loc.deviceId].setPopupContent(popupHtml);
      } else {
        markersRef.current[loc.deviceId] = L.circleMarker([loc.lat, loc.lng], {
          radius,
          color: "#0f172a",
          weight: isSelected ? 3 : 2,
          fillColor: color,
          fillOpacity: 0.92,
        })
          .bindPopup(popupHtml)
          .addTo(map);
      }
    }

    // ---- Auto-fit bounds ----
    const allPoints: [number, number][] = [];
    for (const loc of locations) allPoints.push([loc.lat, loc.lng]);
    for (const trail of Object.values(trails)) {
      for (const [lng, lat] of trail) allPoints.push([lat, lng]);
    }

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 16);
    } else if (allPoints.length > 1) {
      map.fitBounds(allPoints as [number, number][], { padding: [28, 28], maxZoom: 17 });
    }
  }, [locations, selectedUnit, trails]);

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-[var(--tm-border)]">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {locations.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/35">
          <div className="rounded-md border border-slate-500/40 bg-slate-900/75 px-3 py-2 text-xs font-medium text-slate-100">
            No devices online yet. Start Live Tracking to place the first marker.
          </div>
        </div>
      )}
    </div>
  );
}
