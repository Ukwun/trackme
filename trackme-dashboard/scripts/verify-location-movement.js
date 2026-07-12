const fs = require("fs");
const { MongoClient } = require("mongodb");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

(async () => {
  const client = new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: Number(env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 12000),
    family: Number(env.MONGODB_FAMILY || 4),
    tls: true,
  });

  await client.connect();
  const db = client.db();
  const rows = await db
    .collection("location_history")
    .find({ lat: { $type: "number" }, lng: { $type: "number" } })
    .sort({ timestamp: -1 })
    .limit(120)
    .toArray();

  const byDevice = {};
  for (const r of rows) {
    const id = String(r.deviceId || "unknown");
    if (!byDevice[id]) byDevice[id] = [];
    byDevice[id].push({ lat: r.lat, lng: r.lng, t: r.timestamp });
  }

  const out = [];
  for (const [id, list] of Object.entries(byDevice)) {
    const uniq = new Set(list.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`));
    out.push({
      deviceId: id,
      samples: list.length,
      uniquePoints: uniq.size,
      latest: list[0],
      oldest: list[list.length - 1],
    });
  }

  out.sort((a, b) => b.samples - a.samples);
  console.log(JSON.stringify(out.slice(0, 5), null, 2));
  await client.close();
})().catch((e) => {
  console.error("QUERY_FAIL", e.message);
  process.exit(1);
});
