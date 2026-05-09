"use client";

import { useEffect, useRef } from "react";

interface Location {
  deviceId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp?: number;
}

interface MapProps {
  locations: Location[];
  selectedUnit?: Location | null;
  trails?: Record<string, Array<[number, number]>>;
}

export default function Map({ locations, selectedUnit, trails = {} }: MapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to fill container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (locations.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No devices online", canvas.width / 2, canvas.height / 2);
      return;
    }

    // Calculate bounds
    const lats = locations.map((l) => l.lat);
    const lngs = locations.map((l) => l.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 40;

    // Map coordinate to canvas pixel
    const toPixel = (lat: number, lng: number) => {
      const x = padding + ((lng - minLng) / lngRange) * (canvas.width - padding * 2);
      const y = padding + ((maxLat - lat) / latRange) * (canvas.height - padding * 2);
      return { x, y };
    };

    // Draw grid background
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i;
      const x = (canvas.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw trails
    Object.entries(trails).forEach(([deviceId, trail]) => {
      const device = locations.find((l) => l.deviceId === deviceId);
      if (!device) return;

      ctx.strokeStyle = device.deviceId === selectedUnit?.deviceId ? "#06b6d4" : "#8b5cf6";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();

      trail.forEach((coord, idx) => {
        const { x, y } = toPixel(coord[1], coord[0]);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw device markers
    locations.forEach((location) => {
      const { x, y } = toPixel(location.lat, location.lng);
      const isSelected = location.deviceId === selectedUnit?.deviceId;
      const statusColor =
        location.speed && location.speed > 0 ? "#22c55e" : location.battery && location.battery < 25 ? "#ef4444" : "#06b6d4";
      const size = isSelected ? 12 : 8;

      // Draw marker circle
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw selection ring
      if (isSelected) {
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw heading if available
      if (location.heading && location.heading >= 0) {
        const heading = (location.heading * Math.PI) / 180;
        const arrowLen = size * 2;
        const endX = x + Math.sin(heading) * arrowLen;
        const endY = y - Math.cos(heading) * arrowLen;
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });

    // Draw legend
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    let legendY = padding;
    ctx.fillText("● Active    ● Moving    ● Low Batt", padding, legendY);
    legendY += 20;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Devices: ${locations.length}`, padding, legendY);

    // Draw coordinates for selected unit
    if (selectedUnit) {
      const { x, y } = toPixel(selectedUnit.lat, selectedUnit.lng);
      ctx.fillStyle = "#06b6d4";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${selectedUnit.lat.toFixed(4)}`, x, y - 20);
      ctx.fillText(`${selectedUnit.lng.toFixed(4)}`, x, y - 8);
      ctx.fillText(`${selectedUnit.deviceId}`, x, y + 20);
    }
  }, [locations, selectedUnit, trails]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl border border-[var(--tm-border)] bg-slate-950"
      style={{ minHeight: "400px" }}
    />
  );
}
