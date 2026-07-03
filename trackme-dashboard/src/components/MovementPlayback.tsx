"use client";
import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MovementPlayback({ deviceId }: { deviceId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!deviceId) {
      setHistory([]);
      setIndex(0);
      return;
    }
    const token = window.localStorage.getItem("tm_auth_token");
    fetch(`/api/location-history?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => setHistory(data.history || []));
  }, [deviceId]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIndex(i => {
          if (i < history.length - 1) return i + 1;
          setPlaying(false);
          return i;
        });
      }, 1000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, history.length]);

  function handlePlay() { setPlaying(true); }
  function handlePause() { setPlaying(false); }
  function handleRewind() { setIndex(0); setPlaying(false); }
  function handleSpeedChange(e: any) { setSpeed(Number(e.target.value)); }

  const current = history[index];
  const trail = history.slice(0, index + 1).map(h => [h.lng, h.lat]);

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Movement Playback</h2>
      <div className="flex gap-2 mb-2">
        <button onClick={handlePlay} disabled={playing} className="tm-btn tm-btn-primary">Play</button>
        <button onClick={handlePause} disabled={!playing} className="tm-btn">Pause</button>
        <button onClick={handleRewind} className="tm-btn">Rewind</button>
        <label className="ml-2">Speed:
          <select value={speed} onChange={handleSpeedChange} className="ml-1 tm-input">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>
      </div>
      <input type="range" min={0} max={history.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} className="w-full mb-2" />
      <div className="mb-2 text-xs">{current ? `Time: ${new Date(current.timestamp).toLocaleString()}` : "No data"}</div>
      {!current && <div className="text-xs text-[var(--tm-text-secondary)]">No playback coordinates available yet.</div>}
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-[var(--tm-border)] shadow-lg">
        {current && (
          <Map
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            initialViewState={{ latitude: current?.lat || 6.5244, longitude: current?.lng || 3.3792, zoom: 13 }}
            longitude={current?.lng}
            latitude={current?.lat}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%", borderRadius: "1rem" }}
          >
            {trail.length > 1 && (
              <Source type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: trail }, properties: {} }}>
                <Layer id="trail" type="line" paint={{ "line-color": "#3B82F6", "line-width": 4, "line-opacity": 0.7 }} />
              </Source>
            )}
            <Marker longitude={current.lng} latitude={current.lat} anchor="center">
              <div className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-blue-300 shadow-lg">●</div>
            </Marker>
          </Map>
        )}
      </div>
    </div>
  );
}
