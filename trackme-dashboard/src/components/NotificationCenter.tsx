"use client";
import { useEffect, useState } from "react";
import { setupRealtime } from '../realtime';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
    let unsub = () => {};
    async function fetchNotifications() {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    // Real-time updates
    const socket = setupRealtime({
      onNotification: (data) => {
        fetchNotifications();
      }
    });
    unsub = () => {
      socket?.off && socket.off('notification-update');
    };
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((n, idx) => (
        <div key={idx} className={`tm-card px-4 py-2 min-w-[220px] shadow-lg border-l-4 ${n.type === 'danger' ? 'border-[var(--tm-accent-red)]' : n.type === 'warning' ? 'border-[var(--tm-accent-amber)]' : 'border-[var(--tm-accent-blue)]'}` }>
          <div className="text-sm font-semibold mb-1">{n.type?.toUpperCase() || 'INFO'}</div>
          <div className="text-xs">{n.message}</div>
        </div>
      ))}
    </div>
  );
}
