import SharedDevices from "../components/SharedDevices";
import DeviceList from "../components/DeviceList";
import RegisterDevice from "../components/RegisterDevice";
import AuthHeader from "../components/AuthHeader";
import NotificationCenter from "../components/NotificationCenter";
import GeofenceManager from "../components/GeofenceManager";
import AnalyticsPanel from "../components/AnalyticsPanel";

"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { motion } from "framer-motion";

const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

export default function Home() {
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    connectSocket();
    onLocationUpdate((data) => {
      setLocations((prev) => {
        // Only keep the latest location per phone number
        const filtered = prev.filter((l) => l.phone !== data.phone);
        return [...filtered, data];
      });
    });
  }, []);

  const filteredLocations = search
    ? locations.filter((l) => l.phone.includes(search))
    : locations;

  return (
    <>
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
              <div className="w-full h-96 rounded-2xl overflow-hidden border border-[var(--tm-border)] shadow-lg">
                <MapContainer
                  center={[6.5244, 3.3792]} // Lagos default
                  zoom={7}
                  scrollWheelZoom={true}
                  style={{ height: "100%", width: "100%", background: '#0F172A' }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='' // Hide default OSM attribution for custom look
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredLocations.map((loc, idx) => (
                    <Marker key={loc.phone + idx} position={[loc.lat, loc.lng]} icon={L.divIcon({
                      className: '',
                      html: `<div id='tm-marker-${idx}' style='width:36px;height:36px;'></div>`
                    })}>
                      <Popup>
                        <div className="text-xs">
                          <div><b>Phone:</b> {loc.phone}</div>
                          <div><b>IMEI:</b> {loc.imei}</div>
                          <div><b>Lat:</b> {loc.lat}</div>
                          <div><b>Lng:</b> {loc.lng}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {/* Animated radar pulse overlays for each marker */}
                  {filteredLocations.map((loc, idx) => (
                    <CustomMapPulse key={loc.phone + idx} lat={loc.lat} lng={loc.lng} mapRef={mapRef} idx={idx} />
                  ))}
                // Animated radar pulse overlay for live marker
                import L from "leaflet";
                function CustomMapPulse({ lat, lng, mapRef, idx }: { lat: number, lng: number, mapRef: any, idx: number }) {
                  useEffect(() => {
                    if (!mapRef.current) return;
                    const map = mapRef.current;
                    const pane = map.getPane ? map.getPane('markerPane') : null;
                    if (!pane) return;
                    const el = document.getElementById(`tm-marker-${idx}`);
                    if (!el) return;
                    // Render Framer Motion pulse inside marker div
                <div className="flex-1 flex flex-col gap-6 min-w-[320px] max-w-md">
                  <div className="tm-card p-4 mb-4">
                    <GeofenceManager />
                    <AnalyticsPanel />
                  </div>
                    el.innerHTML = '';
                    const pulse = document.createElement('div');
                    pulse.style.position = 'relative';
                    pulse.style.width = '36px';
                    pulse.style.height = '36px';
                    pulse.style.display = 'flex';
                    pulse.style.alignItems = 'center';
                    pulse.style.justifyContent = 'center';
                    el.appendChild(pulse);
                    // Use Framer Motion for animation
                    import('react-dom').then(ReactDOM => {
                      ReactDOM.render(
                        <motion.div
                          initial={{ scale: 0.7, opacity: 0.7 }}
                          animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.7, 0.2, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'rgba(59,130,246,0.25)',
                            border: '2px solid #3B82F6',
                            boxShadow: '0 0 16px #3B82F6',
                            position: 'absolute',
                            left: 2,
                            top: 2,
                            zIndex: 10,
                          }}
                        />,
                        pulse
                      );
                    });
                    return () => {
                      el.innerHTML = '';
                    };
                  }, [lat, lng, mapRef, idx]);
                  return null;
                }
                </MapContainer>
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
              {typeof window !== "undefined" && require("../components/MobileClientSimulator").default && (
                require("../components/MobileClientSimulator").default()
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
