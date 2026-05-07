// Simulate sending location updates to the dashboard via Socket.IO

const io = require("socket.io-client");

const socket = io("http://localhost:3000/api/socketio");

const testData = [
  { phone: "2347019103858", imei: "35004858279053", lat: 6.4590678, lng: 3.5178051 },
  { phone: "2348038672986", imei: "SOFT_TARGET", lat: 5.4592428, lng: 7.0102730 },
  { phone: "2348139092811", imei: "I_H_S_COLONOTHER", lat: 6.4590850, lng: 3.5250449 },
  { phone: "2347034511365", imei: "NORTHERN_FORE", lat: 6.4590678, lng: 3.5178051 },
];

let idx = 0;

socket.on("connect", () => {
  console.log("Connected to dashboard, sending test data...");
  setInterval(() => {
    const data = testData[idx % testData.length];
    socket.emit("location-update", data);
    console.log("Sent:", data);
    idx++;
  }, 3000);
});
