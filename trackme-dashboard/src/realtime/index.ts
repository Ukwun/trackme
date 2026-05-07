import { connectSocket } from './socket';

export function setupRealtime({ onAnalytics, onNotification }: {
  onAnalytics?: (data: any) => void,
  onNotification?: (data: any) => void,
} = {}) {
  const socket = connectSocket();
  if (onAnalytics) {
    socket.on('analytics-update', onAnalytics);
  }
  if (onNotification) {
    socket.on('notification-update', onNotification);
  }
  return socket;
}
