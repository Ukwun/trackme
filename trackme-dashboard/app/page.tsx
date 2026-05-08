"use client";

import NotificationCenter from "../src/components/NotificationCenter";
import RightIntelligencePanel from "../src/components/RightIntelligencePanel";
import AuthHeader from "../src/components/AuthHeader";
import AuthForm from "../src/components/AuthForm";
import TwoFactorSetup from "../src/components/TwoFactorSetup";
import UserManagement from "../src/components/UserManagement";
import ActivityLog from "../src/components/ActivityLog";
import { useEffect, useRef, useState } from "react";
import MobileClientSimulator from "../src/components/MobileClientSimulator";
import RegisterDevice from "../src/components/RegisterDevice";
import DeviceList from "../src/components/DeviceList";
import SharedDevices from "../src/components/SharedDevices";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import { connectSocket, onLocationUpdate } from "../src/realtime/socket";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoidHJhY2ttZXVzZXIiLCJhIjoiY2xkZ2Z2b2JwMGJ6dTNrbzF2b2Z6b2J1dSJ9.2v1Qw1Qw1Qw1Qw1Qw1Qw1Q"; // Replace with your token

function CustomMapPulse() {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0.7 }}
      animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.7, 0.2, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="absolute -left-2 -top-2 w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500/20 z-10 pointer-events-none"
    />
  );
}

  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<{[id: string]: Array<[number, number]>}>({});
  const [geofences, setGeofences] = useState<any[]>([]);
  const [incident, setIncident] = useState<any>(null);
  const [viewport, setViewport] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
    zoom: 7,
  });
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<any>(null);
  const [editorFeatures, setEditorFeatures] = useState<any[]>([]);
  const [show2FA, setShow2FA] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    onLocationUpdate((data) => {
      setLocations((prev) => {
        // Only keep the latest location per deviceId
        const filtered = prev.filter((l) => l.deviceId !== data.deviceId);
        // Update trails
        setUnitTrails((trails) => {
          const id = data.deviceId;
          const prevTrail = trails[id] || [];
          const newTrail = [...prevTrail, [data.lng, data.lat]].slice(-20); // last 20 points
          return { ...trails, [id]: newTrail };
        });
        return [...filtered, data];
      });
    });
    socket.on("geofence-update", setGeofences);
    socket.on("incident-update", setIncident);
    return () => {
      socket.off("geofence-update", setGeofences);
      socket.off("incident-update", setIncident);
    };
  }, []);

  // Check if 2FA is enabled (call /api/2fa?check=1)
  useEffect(() => {
    if (!token) return;
    fetch("/api/2fa?check=1", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setShow2FA(!data.enabled);
      });
  }, [token]);

  // Handle geofence draw/save
  function onEditorUpdate({ data }: any) {
    setEditorFeatures(data);
  }
  function saveGeofence() {
    if (!token) {
      setShow2FA(true); // or show auth form/modal as appropriate
      return;
    }
    if (editorFeatures.length > 0) {
      // Only support one drawn polygon at a time for now
      const poly = editorFeatures[0];
      const coords = poly.geometry.coordinates[0];
      const newGeofence = {
        id: `GEO_${Date.now()}`,
        name: `Custom Geofence ${Date.now()}`,
        type: "Custom",
        status: "Active",
        coordinates: coords,
      };
      const socket = connectSocket();
      socket.emit("geofence-update", [newGeofence, ...geofences]);
      setEditorFeatures([]);
      setDrawMode(null);
    }
  }

  const filteredLocations = search
    ? locations.filter((l) => (l.deviceId || "").includes(search))
    : locations;

  // Clustering
  const points = filteredLocations.map((loc) => ({
    type: "Feature",
    properties: { cluster: false, ...loc },
    geometry: { type: "Point", coordinates: [loc.lng, loc.lat] },
  }));
  const cluster = new Supercluster({ radius: 60, maxZoom: 16 });
  cluster.load(points);
  const bounds = [viewport.longitude - 1, viewport.latitude - 1, viewport.longitude + 1, viewport.latitude + 1];
  const clusters = cluster.getClusters(bounds, Math.round(viewport.zoom));

  if (!token) {
    return <AuthForm onAuth={(t, r) => { setToken(t); setRole(r); }} />;
  }

  // Show 2FA setup if not enabled
  if (show2FA) {
    return <TwoFactorSetup token={token} />;
  }

  return (
    <>
      <NotificationCenter />
      <AuthHeader />
      <main className="w-full max-w-6xl flex flex-col items-center justify-start gap-6 px-2 sm:px-8 py-8">
        <h1 className="tm-heading text-3xl md:text-4xl font-bold mb-2 text-[--tm-accent-blue]" style={{fontFamily: 'Sora, Inter, sans-serif'}}>Trackme Dashboard</h1>
        <p className="mb-4 text-[--tm-text-secondary]">Search and view tracked phone numbers on the map in real time.</p>
        <div className="flex flex-col md:flex-row w-full gap-6">
          <div className="flex-1 flex flex-col gap-6">
            {/* Incident Creation */}
            <CreateIncident onCreated={setIncident} />
            {/* Map and tracked devices */}
            <div className="tm-card p-4">
              <input
                type="text"
                placeholder="Search phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4 p-2 rounded w-full bg-[--tm-bg-secondary] border border-[--tm-border] text-[--tm-text-main] focus:outline-none focus:ring-2 focus:ring-[--tm-accent-blue]"
              />
              <div className="w-full h-96 rounded-2xl overflow-hidden border border-[--tm-border] shadow-lg relative">
                <div className="absolute z-10 left-4 top-4 flex gap-2">
                  <button
                    className={`px-3 py-1 rounded bg-blue-700 text-white text-xs font-semibold shadow ${drawMode ? 'opacity-80' : ''}`}
                    onClick={() => setDrawMode(drawMode ? null : new DrawPolygonMode())}
                  >{drawMode ? 'Cancel Draw' : 'Draw Geofence'}</button>
                  {drawMode && (
                    <button
                      className="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold shadow"
                      onClick={saveGeofence}
                    >Save Geofence</button>
                  )}
                </div>
                <Map
                  ref={mapRef}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  initialViewState={viewport}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  style={{ width: "100%", height: "100%", borderRadius: "1rem" }}
                  onMove={evt => setViewport(evt.viewState)}
                >
                  <NavigationControl position="top-left" />
                  {/* Heatmap Layer for device activity */}
                  <Source
                    id="heatmap"
                    type="geojson"
                    data={{
                      type: "FeatureCollection",
                      features: filteredLocations.map((loc) => ({
                        type: "Feature",
                        properties: {},
                        geometry: { type: "Point", coordinates: [loc.lng, loc.lat] },
                      })),
                    }}
                  >
                    <Layer
                      id="heatmap-layer"
                      type="heatmap"
                      paint={{
                        "heatmap-weight": 1,
                        "heatmap-intensity": 1,
                        "heatmap-radius": 30,
                        "heatmap-opacity": 0.5,
                        "heatmap-color": [
                          "interpolate",
                          ["linear"],
                          ["heatmap-density"],
                          0, "rgba(0,0,255,0)",
                          0.2, "#00bfff",
                          0.4, "#3b82f6",
                          0.6, "#f59e42",
                          0.8, "#ef4444",
                          1, "#b91c1c"
                        ],
                      }}
                    />
                  </Source>
                  {/* Clusters and Markers */}
                  {clusters.map((feature, idx) => {
                    const [lng, lat] = feature.geometry.coordinates;
                    if (feature.properties.cluster) {
                      return (
                        <Marker key={"cluster-" + idx} longitude={lng} latitude={lat} anchor="center">
                          <div
                            className="bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-blue-300 shadow-lg cursor-pointer"
                            onClick={() => {
                              // Zoom in on cluster click
                              if (mapRef.current) {
                                mapRef.current.flyTo({ center: [lng, lat], zoom: Math.min(viewport.zoom + 2, 18), duration: 1200 });
                              }
                            }}
                          >
                            {feature.properties.point_count_abbreviated}
                          </div>
                        </Marker>
                      );
                    }
                    return (
                      <Marker key={feature.properties.deviceId + idx} longitude={lng} latitude={lat} anchor="center">
                        <div
                          className={`relative cursor-pointer ${selectedUnit && selectedUnit.deviceId === feature.properties.deviceId ? 'ring-2 ring-blue-400' : ''}`}
                          onClick={() => {
                            setSelectedUnit(feature.properties);
                            if (mapRef.current) {
                              mapRef.current.flyTo({ center: [lng, lat], zoom: Math.max(viewport.zoom, 14), duration: 1200 });
                            }
                          }}
                        >
                          <div className="bg-zinc-900/90 text-xs rounded px-2 py-1 mt-2 shadow-lg border border-[--tm-border]">
                            <div><b>Device:</b> {feature.properties.deviceId}</div>
                            <div><b>Lat:</b> {lat}</div>
                            <div><b>Lng:</b> {lng}</div>
                            <div><b>Speed:</b> {feature.properties.speed ?? "-"} km/h</div>
                            <div><b>Heading:</b> {feature.properties.heading ?? "-"}°</div>
                            <div><b>Battery:</b> {feature.properties.battery ?? "-"}%</div>
                            <div><b>Time:</b> {feature.properties.timestamp ? new Date(feature.properties.timestamp * 1000).toLocaleString() : "-"}</div>
                          </div>
                        </div>
                      </Marker>
                    );
                  })}
                  {/* Animated Trails */}
                  {Object.entries(unitTrails).map(([id, trail]) => (
                    <Source key={id} type="geojson" data={{
                      type: "Feature",
                      geometry: { type: "LineString", coordinates: trail },
                    }}>
                      <Layer
                        id={`trail-${id}`}
                        type="line"
                        paint={{ "line-color": "#3B82F6", "line-width": 3, "line-opacity": 0.7 }}
                      />
                    </Source>
                  ))}
                  {/* Incident Marker */}
                  {incident && incident.location && Array.isArray(incident.location) && incident.location.length === 2 && (
                    <Marker longitude={incident.location[1]} latitude={incident.location[0]} anchor="center">
                      <div className="bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-red-300 shadow-lg">
                        !
                      </div>
                      <div className="bg-zinc-900/90 text-xs rounded px-2 py-1 mt-2 shadow-lg border border-[--tm-border]">
                        <div><b>Incident:</b> {incident.type}</div>
                        <div><b>Status:</b> {incident.status}</div>
                        <div><b>ID:</b> {incident.id}</div>
                      </div>
                    </Marker>
                  )}
                  {/* Geofence Polygons */}
                  {geofences.map((geo, idx) => (
                    <Source
                      key={geo.id}
                      type="geojson"
                      data={{
                        type: "Feature",
                        geometry: {
                          type: "Polygon",
                          coordinates: [geo.coordinates],
                        },
                      }}
                    >
                      <Layer
                        id={`geofence-${geo.id}`}
                        type="fill"
                        paint={{ "fill-color": geo.status === "Active" ? "#22d3ee" : "#64748b", "fill-opacity": 0.2 }}
                      />
                      <Layer
                        id={`geofence-outline-${geo.id}`}
                        type="line"
                        paint={{ "line-color": geo.status === "Active" ? "#22d3ee" : "#64748b", "line-width": 2 }}
                      />
                    </Source>
                  ))}
                  {/* Geofence Drawing Editor */}
                  <Editor
                    mode={drawMode}
                    features={editorFeatures}
                    onUpdate={onEditorUpdate}
                    editHandleShape="circle"
                    featureShape="polygon"
                  />
                </Map>
              </div>
            </div>
            <div className="tm-card p-4">
              <h2 className="tm-heading text-xl font-semibold mb-2">Tracked Devices (Live)</h2>
              <table className="w-full table-auto border-collapse text-[--tm-text-main]">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Device ID</th>
                    <th className="border px-2 py-1">Latitude</th>
                    <th className="border px-2 py-1">Longitude</th>
                    <th className="border px-2 py-1">Speed</th>
                    <th className="border px-2 py-1">Heading</th>
                    <th className="border px-2 py-1">Battery</th>
                    <th className="border px-2 py-1">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((loc, idx) => (
                    <tr
                      key={loc.deviceId + idx}
                      className={selectedUnit && selectedUnit.deviceId === loc.deviceId ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                      onClick={() => {
                        setSelectedUnit(loc);
                        if (mapRef.current) {
                          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: Math.max(viewport.zoom, 14), duration: 1200 });
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="border px-2 py-1">{loc.deviceId}</td>
                      <td className="border px-2 py-1">{loc.lat}</td>
                      <td className="border px-2 py-1">{loc.lng}</td>
                      <td className="border px-2 py-1">{loc.speed ?? "-"}</td>
                      <td className="border px-2 py-1">{loc.heading ?? "-"}</td>
                      <td className="border px-2 py-1">{loc.battery ?? "-"}</td>
                      <td className="border px-2 py-1">{loc.timestamp ? new Date(loc.timestamp * 1000).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Activity Log for all users */}
            <ActivityLog token={token} />
            {/* User Management for super_admin only */}
            {role === "super_admin" && <UserManagement token={token} />}
          </div>
          <div className="flex-1 flex flex-col gap-6 min-w-[320px] max-w-md">
            {/* Right Intelligence Panel */}
            {selectedUnit && (
              <RightIntelligencePanel selectedUnit={selectedUnit} onClose={() => setSelectedUnit(null)} />
            )}
            <div className="tm-card p-4 mb-4">
              <RegisterDevice />
            </div>
            <div className="tm-card p-4 mb-4">
              <DeviceList />
            </div>
            <div className="tm-card p-4 mb-4">
              <SharedDevices />
            </div>
            <div className="tm-card p-4 mb-4">
              <MobileClientSimulator />
            </div>
          </div>
        </div>
      </main>
    </>
  );
  );
}
