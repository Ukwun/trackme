import { expect, test, APIRequestContext } from "@playwright/test";

type AuthResult = {
  token: string;
  userId: string;
};

type Role =
  | "super_admin"
  | "control_room"
  | "dispatcher"
  | "patrol_officer"
  | "analyst"
  | "field_agent";

const roleMatrix: Array<{
  role: Role;
  deviceCreateAllowed: boolean;
  incidentCreateAllowed: boolean;
  incidentAssignAllowed: boolean;
  incidentStatusAllowed: boolean;
  geofenceCreateAllowed: boolean;
  geofenceUpdateAllowed: boolean;
  geofenceTriggerAllowed: boolean;
}> = [
  {
    role: "super_admin",
    deviceCreateAllowed: true,
    incidentCreateAllowed: true,
    incidentAssignAllowed: true,
    incidentStatusAllowed: true,
    geofenceCreateAllowed: true,
    geofenceUpdateAllowed: true,
    geofenceTriggerAllowed: true,
  },
  {
    role: "control_room",
    deviceCreateAllowed: true,
    incidentCreateAllowed: false,
    incidentAssignAllowed: true,
    incidentStatusAllowed: true,
    geofenceCreateAllowed: true,
    geofenceUpdateAllowed: true,
    geofenceTriggerAllowed: true,
  },
  {
    role: "dispatcher",
    deviceCreateAllowed: true,
    incidentCreateAllowed: true,
    incidentAssignAllowed: true,
    incidentStatusAllowed: true,
    geofenceCreateAllowed: false,
    geofenceUpdateAllowed: false,
    geofenceTriggerAllowed: false,
  },
  {
    role: "patrol_officer",
    deviceCreateAllowed: false,
    incidentCreateAllowed: true,
    incidentAssignAllowed: false,
    incidentStatusAllowed: true,
    geofenceCreateAllowed: false,
    geofenceUpdateAllowed: false,
    geofenceTriggerAllowed: false,
  },
  {
    role: "analyst",
    deviceCreateAllowed: false,
    incidentCreateAllowed: false,
    incidentAssignAllowed: false,
    incidentStatusAllowed: false,
    geofenceCreateAllowed: false,
    geofenceUpdateAllowed: false,
    geofenceTriggerAllowed: false,
  },
  {
    role: "field_agent",
    deviceCreateAllowed: false,
    incidentCreateAllowed: true,
    incidentAssignAllowed: false,
    incidentStatusAllowed: true,
    geofenceCreateAllowed: false,
    geofenceUpdateAllowed: false,
    geofenceTriggerAllowed: false,
  },
];

function decodeJwtPayload(token: string): any {
  const [, payloadPart] = token.split(".");
  const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const raw = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(raw);
}

async function registerAndLogin(request: APIRequestContext, role: Role): Promise<AuthResult> {
  const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `${role}+${seed}@matrix.test.local`;
  const password = "Passw0rd!";

  const registerRes = await request.post("/api/auth", {
    data: { action: "register", email, password, role },
  });
  expect(registerRes.ok()).toBeTruthy();

  const loginRes = await request.post("/api/auth", {
    data: { action: "login", email, password },
  });
  expect(loginRes.ok()).toBeTruthy();

  const loginData = await loginRes.json();
  const token = String(loginData.token);
  const payload = decodeJwtPayload(token);

  return { token, userId: String(payload.userId) };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

test.describe("Role-Action Matrix: devices, incidents, geofences", () => {
  test("validates role permissions with realistic API flow", async ({ request }) => {
    const admin = await registerAndLogin(request, "super_admin");

    const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const incidentCreateByAdmin = await request.post("/api/incidents", {
      headers: authHeaders(admin.token),
      data: { type: "Robbery", location: `Matrix Zone ${seed}` },
    });
    expect(incidentCreateByAdmin.ok()).toBeTruthy();

    const adminIncidentData = await incidentCreateByAdmin.json();
    const baseIncidentId = String(adminIncidentData.incident?._id || adminIncidentData.incident?.id);
    expect(baseIncidentId.length).toBeGreaterThan(0);

    for (const row of roleMatrix) {
      const auth = await registerAndLogin(request, row.role);
      const headers = authHeaders(auth.token);

      const phone = `081${Date.now().toString().slice(-7)}`;
      const imei = `IMEI-${row.role}-${Math.random().toString(36).slice(2, 8)}`;
      const deviceCreate = await request.post("/api/devices", {
        headers,
        data: { phone, imei, name: `${row.role} device` },
      });

      if (row.deviceCreateAllowed) {
        expect(deviceCreate.status(), `${row.role}: device:create should be allowed`).toBe(200);
      } else {
        expect(deviceCreate.status(), `${row.role}: device:create should be denied`).toBe(403);
      }

      const incidentCreate = await request.post("/api/incidents", {
        headers,
        data: { type: "Accident", location: `Role ${row.role}` },
      });

      if (row.incidentCreateAllowed) {
        expect(incidentCreate.status(), `${row.role}: incident:create should be allowed`).toBe(200);
      } else {
        expect(incidentCreate.status(), `${row.role}: incident:create should be denied`).toBe(403);
      }

      const incidentAssign = await request.patch("/api/incidents", {
        headers,
        data: { incidentId: baseIncidentId, assignUnitId: `UNIT_${row.role.toUpperCase()}` },
      });

      if (row.incidentAssignAllowed) {
        expect(incidentAssign.status(), `${row.role}: incident:assign should be allowed`).toBe(200);
      } else {
        expect(incidentAssign.status(), `${row.role}: incident:assign should be denied`).toBe(403);
      }

      const incidentStatus = await request.patch("/api/incidents", {
        headers,
        data: { incidentId: baseIncidentId, status: "Engaged" },
      });

      if (row.incidentStatusAllowed) {
        expect(incidentStatus.status(), `${row.role}: incident:update should be allowed`).toBe(200);
      } else {
        expect(incidentStatus.status(), `${row.role}: incident:update should be denied`).toBe(403);
      }

      const geofenceName = `Geo ${row.role} ${seed}`;
      const geofenceCreate = await request.post("/api/geofences", {
        headers,
        data: { name: geofenceName, center: [6.5244, 3.3792], radius: 1000 },
      });

      if (row.geofenceCreateAllowed) {
        expect(geofenceCreate.status(), `${row.role}: geofence:create should be allowed`).toBe(200);

        const geofencesRes = await request.get("/api/geofences", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        expect(geofencesRes.status()).toBe(200);
        const geofencesData = await geofencesRes.json();
        const created = (geofencesData.geofences || []).find((g: any) => g.name === geofenceName);
        const geofenceId = String(created?._id || created?.id || "");
        expect(geofenceId.length).toBeGreaterThan(0);

        const geofencePatch = await request.patch("/api/geofences", {
          headers,
          data: { geofenceId, radius: 1200 },
        });

        if (row.geofenceUpdateAllowed) {
          expect(geofencePatch.status(), `${row.role}: geofence:update should be allowed`).toBe(200);
        } else {
          expect(geofencePatch.status(), `${row.role}: geofence:update should be denied`).toBe(403);
        }

        const geofenceTrigger = await request.post("/api/geofences/events", {
          headers,
          data: { deviceId: `UNIT_${row.role.toUpperCase()}`, location: [6.5244, 3.3792] },
        });

        if (row.geofenceTriggerAllowed) {
          expect(geofenceTrigger.status(), `${row.role}: geofence trigger should be allowed`).toBe(200);
          const triggerData = await geofenceTrigger.json();
          expect(Array.isArray(triggerData.triggered)).toBeTruthy();
        } else {
          expect(geofenceTrigger.status(), `${row.role}: geofence trigger should be denied`).toBe(403);
        }
      } else {
        expect(geofenceCreate.status(), `${row.role}: geofence:create should be denied`).toBe(403);

        const geofenceTriggerDenied = await request.post("/api/geofences/events", {
          headers,
          data: { deviceId: `UNIT_${row.role.toUpperCase()}`, location: [6.5244, 3.3792] },
        });
        expect(geofenceTriggerDenied.status(), `${row.role}: geofence trigger should be denied`).toBe(403);
      }
    }
  });
});
