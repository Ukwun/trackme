
"use client";

import NotificationCenter from "../src/components/NotificationCenter";
import AuthHeader from "../src/components/AuthHeader";
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import MobileClientSimulator from "../src/components/MobileClientSimulator";
import RegisterDevice from "../src/components/RegisterDevice";
import DeviceList from "../src/components/DeviceList";
import SharedDevices from "../src/components/SharedDevices";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import { Editor, DrawPolygonMode, EditingMode } from "react-map-gl-draw";
import { connectSocket } from "../src/realtime/socket";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoidHJhY2ttZXVzZXIiLCJhIjoiY2xkZ2Z2b2JwMGJ6dTNrbzF2b2Z6b2J1dSJ9.2v1Qw1Qw1Qw1Qw1Qw1Qw1Q"; // Replace with your token

function CustomMapPulse() {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0.7 }}
      animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.7, 0.2, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="absolute left-[-8px] top-[-8px] w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500/20 z-10 pointer-events-none"
    />
  );
}

  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<{[id: string]: Array<[number, number]>}>({});
  const [geofences, setGeofences] = useState<any[]>([]);
  const [viewport, setViewport] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
    zoom: 7,
  });
  const [drawMode, setDrawMode] = useState<any>(null);
  const [editorFeatures, setEditorFeatures] = useState<any[]>([]);

  useEffect(() => {
    connectSocket();
    onLocationUpdate((data) => {
      setLocations((prev) => {
        // Only keep the latest location per phone number
        const filtered = prev.filter((l) => l.phone !== data.phone);
        // Update trails
        setUnitTrails((trails) => {
          const id = data.phone;
          const prevTrail = trails[id] || [];
          const newTrail = [...prevTrail, [data.lng, data.lat]].slice(-20); // last 20 points
          return { ...trails, [id]: newTrail };
        });
        return [...filtered, data];
      });
    });
    // Listen for geofence updates
    const socket = connectSocket();
    socket.on("geofence-update", setGeofences);
    return () => { socket.off("geofence-update", setGeofences); };
  }, []);

  // Handle geofence draw/save
  function onEditorUpdate({ data }: any) {
    setEditorFeatures(data);
  }
  function saveGeofence() {
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
    ? locations.filter((l) => l.phone.includes(search))
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

  return (
    <>
      <SignedIn>
        <NotificationCenter />
        <AuthHeader />
        <main className="w-full max-w-6xl flex flex-col items-center justify-start gap-6 px-2 sm:px-8 py-8">
          <h1 className="tm-heading text-3xl md:text-4xl font-bold mb-2 text-[var(--tm-accent-blue)]" style={{fontFamily: 'Sora, Inter, sans-serif'}}>Trackme Dashboard</h1>
          <p className="mb-4 text-[var(--tm-text-secondary)]">Search and view tracked phone numbers on the map in real time.</p>
          <div className="flex flex-col md:flex-row w-full gap-6">
            <div className="flex-1 flex flex-col gap-6">
              <div className="tm-card p-4">
                <input
                  type="text"
                  placeholder="Search phone number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-4 p-2 rounded w-full bg-[var(--tm-bg-secondary)] border border-[var(--tm-border)] text-[var(--tm-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--tm-accent-blue)]"
                />
                <div className="w-full h-96 rounded-2xl overflow-hidden border border-[var(--tm-border)] shadow-lg relative">
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
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={viewport}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    style={{ width: "100%", height: "100%", borderRadius: "1rem" }}
                  >
                    <NavigationControl position="top-left" />
                    {/* Clusters and Markers */}
                    {clusters.map((feature, idx) => {
                      const [lng, lat] = feature.geometry.coordinates;
                      if (feature.properties.cluster) {
                        return (
                          <Marker key={"cluster-" + idx} longitude={lng} latitude={lat} anchor="center">
                            <div className="bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-blue-300 shadow-lg">
                              {feature.properties.point_count_abbreviated}
                            </div>
                          </Marker>
                        );
                      }
                      return (
                        <Marker key={feature.properties.phone + idx} longitude={lng} latitude={lat} anchor="center">
                          <CustomMapPulse />
                          <div className="bg-zinc-900/90 text-xs rounded px-2 py-1 mt-2 shadow-lg border border-[var(--tm-border)]">
                            <div><b>Phone:</b> {feature.properties.phone}</div>
                            <div><b>IMEI:</b> {feature.properties.imei}</div>
                            <div><b>Lat:</b> {lat}</div>
                            <div><b>Lng:</b> {lng}</div>
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
                <table className="w-full table-auto border-collapse text-[var(--tm-text-main)]">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Phone</th>
                      <th className="border px-2 py-1">IMEI</th>
                      <th className="border px-2 py-1">Latitude</th>
                      <th className="border px-2 py-1">Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((loc, idx) => (
                      <tr key={loc.phone + idx}>
                        <td className="border px-2 py-1">{loc.phone}</td>
                        <td className="border px-2 py-1">{loc.imei}</td>
                        <td className="border px-2 py-1">{loc.lat}</td>
                        <td className="border px-2 py-1">{loc.lng}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-6 min-w-[320px] max-w-md">
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
      </SignedIn>
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <SignIn />
        </div>
      </SignedOut>
    </>
  );
}
