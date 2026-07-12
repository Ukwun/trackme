const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";
const runId = Date.now();
const deviceId = `SMOKE_TEST_DEVICE_${runId}`;
const phone = `+1555${String(runId).slice(-7)}`;
const imei = `99${String(runId).slice(-13)}`;

async function run() {
  const print = async (label, res) => {
    const text = await res.text();
    console.log(label, res.status, text);
  };

  console.log("GET consent before grant");
  let res = await fetch(
    `${base}/api/consent?deviceId=${encodeURIComponent(deviceId)}&phone=${encodeURIComponent(phone)}&imei=${encodeURIComponent(imei)}`
  );
  await print("GET consent before grant:", res);

  console.log("POST anonymous location before consent (must be rejected)");
  res = await fetch(`${base}/api/location-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      phone,
      imei,
      lat: 6.5244,
      lng: 3.3792,
      speed: 8.5,
      heading: 90,
      battery: 85,
      accuracy: 4,
      timestamp: Math.floor(Date.now() / 1000),
    }),
  });
  if (res.status !== 403) throw new Error(`Expected 403 before consent, received ${res.status}`);
  await print("POST anonymous location before consent:", res);

  console.log("POST explicit consent");
  res = await fetch(`${base}/api/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, phone, imei, permanent: true }),
  });
  if (!res.ok) throw new Error(`Consent grant failed with ${res.status}`);
  await print("POST explicit consent:", res);

  console.log("GET consent after explicit grant");
  res = await fetch(`${base}/api/consent?deviceId=${encodeURIComponent(deviceId)}`);
  await print("GET consent after anonymous grant:", res);

  console.log("POST anonymous location after consent");
  res = await fetch(`${base}/api/location-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      phone,
      imei,
      lat: 6.5254,
      lng: 3.3802,
      speed: 9.2,
      heading: 95,
      battery: 84,
      accuracy: 3,
      timestamp: Math.floor(Date.now() / 1000),
    }),
  });
  if (!res.ok) throw new Error(`Expected accepted location after consent, received ${res.status}`);
  await print("POST anonymous location after consent:", res);

  console.log("GET debug runtime");
  res = await fetch(`${base}/api/debug/runtime`);
  await print("GET debug runtime:", res);
}

run().catch((err) => {
  console.error("Smoke test failed", err);
  process.exit(1);
});
