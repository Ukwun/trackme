import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../src/api/db";
import { logActivity } from "../../../../src/api/logActivity";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";
import { resolveSession } from "../../../../src/api/authSession";

/**
 * Analytics Export API
 * Provides system-wide analytics, reporting, and export capabilities
 * SUPER_ADMIN has access to all analytics; others see role-specific data
 */

// GET: Retrieve analytics data and reports
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission({ role }, "analytics:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(userId + ":analytics:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { startDate, endDate, metric = "all" } = Object.fromEntries(
    new URL(req.url).searchParams
  );

  const db = await getDb();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const end = endDate ? new Date(endDate) : new Date();

  // Build analytics response
  const analytics: Record<string, any> = {
    period: { start: start.toISOString(), end: end.toISOString() },
    generatedAt: new Date().toISOString(),
  };

  // Fetch metrics based on role
  if (role === "super_admin" || metric === "all" || metric === "incidents") {
    const incidents = await db
      .collection("incidents")
      .find({ createdAt: { $gte: start, $lte: end } })
      .toArray();

    analytics.incidents = {
      total: incidents.length,
      byStatus: incidents.reduce(
        (acc: any, inc: any) => {
          acc[inc.status] = (acc[inc.status] || 0) + 1;
          return acc;
        },
        {}
      ),
      byType: incidents.reduce(
        (acc: any, inc: any) => {
          acc[inc.type] = (acc[inc.type] || 0) + 1;
          return acc;
        },
        {}
      ),
      averageResolutionTime: calculateAverageResolutionTime(incidents),
    };
  }

  if (role === "super_admin" || metric === "all" || metric === "devices") {
    const devices = await db.collection("devices").find({}).toArray();

    analytics.devices = {
      total: devices.length,
      active: devices.filter((d: any) => !d.disabled).length,
      disabled: devices.filter((d: any) => d.disabled).length,
      byOwner: devices.reduce(
        (acc: any, dev: any) => {
          acc[dev.owner] = (acc[dev.owner] || 0) + 1;
          return acc;
        },
        {}
      ),
    };
  }

  if (role === "super_admin" || metric === "all" || metric === "users") {
    const users = await db.collection("users").find({}).toArray();

    analytics.users = {
      total: users.length,
      byRole: users.reduce(
        (acc: any, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        },
        {}
      ),
      active: users.length, // Simplified - could track lastLogin
    };
  }

  if (role === "super_admin" || metric === "all" || metric === "activity") {
    const activities = await db
      .collection("activity_logs")
      .find({ timestamp: { $gte: start, $lte: end } })
      .toArray();

    analytics.activity = {
      total: activities.length,
      byAction: activities.reduce(
        (acc: any, act: any) => {
          acc[act.action] = (acc[act.action] || 0) + 1;
          return acc;
        },
        {}
      ),
      byUser: role === "super_admin" ? 
        activities.reduce(
          (acc: any, act: any) => {
            acc[act.userId] = (acc[act.userId] || 0) + 1;
            return acc;
          },
          {}
        ) : undefined,
    };
  }

  await logActivity({
    userId,
    action: "analytics:view",
    meta: { metric, startDate, endDate },
  });

  return NextResponse.json({ analytics });
}

// POST: Export analytics report
export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission({ role }, "analytics:export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(userId + ":analytics:export")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const {
    reportType = "comprehensive",
    startDate,
    endDate,
    format = "json",
    includeDetails = true,
  } = body;

  const db = await getDb();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Compile comprehensive report
  const report: Record<string, any> = {
    type: reportType,
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  };

  // Gather all metrics
  if (reportType === "comprehensive" || reportType === "incidents") {
    const incidents = await db
      .collection("incidents")
      .find({ createdAt: { $gte: start, $lte: end } })
      .toArray();

    report.incidents = {
      summary: {
        total: incidents.length,
        byStatus: incidents.reduce(
          (acc: any, inc: any) => ({
            ...acc,
            [inc.status]: (acc[inc.status] || 0) + 1,
          }),
          {}
        ),
        byType: incidents.reduce(
          (acc: any, inc: any) => ({
            ...acc,
            [inc.type]: (acc[inc.type] || 0) + 1,
          }),
          {}
        ),
      },
      ...(includeDetails && { details: incidents }),
    };
  }

  if (reportType === "comprehensive" || reportType === "devices") {
    const devices = await db.collection("devices").find({}).toArray();
    report.devices = {
      summary: {
        total: devices.length,
        active: devices.filter((d: any) => !d.disabled).length,
        disabled: devices.filter((d: any) => d.disabled).length,
      },
      ...(includeDetails && { details: devices }),
    };
  }

  if (reportType === "comprehensive" || reportType === "users") {
    const users = await db.collection("users").find({}).toArray();
    report.users = {
      summary: {
        total: users.length,
        byRole: users.reduce(
          (acc: any, user: any) => ({
            ...acc,
            [user.role]: (acc[user.role] || 0) + 1,
          }),
          {}
        ),
      },
      ...(includeDetails && { details: users.map((u: any) => ({ _id: u._id, email: u.email, role: u.role })) }),
    };
  }

  await logActivity({
    userId,
    action: "analytics:export",
    meta: { reportType, format, startDate, endDate },
  });

  // Format response
  if (format === "csv") {
    return exportReportAsCSV(report);
  }

  if (format === "json") {
    return NextResponse.json(
      { success: true, report },
      {
        headers: {
          "Content-Disposition": `attachment; filename="analytics-report-${Date.now()}.json"`,
        },
      }
    );
  }

  return NextResponse.json({ success: true, report });
}

function calculateAverageResolutionTime(incidents: any[]): number {
  const resolved = incidents.filter((inc) => inc.status === "closed" || inc.status === "resolved");
  if (resolved.length === 0) return 0;

  const totalTime = resolved.reduce((sum, inc) => {
    const createdAt = new Date(inc.createdAt).getTime();
    const closedAt = new Date(inc.closedAt || inc.updatedAt).getTime();
    return sum + (closedAt - createdAt);
  }, 0);

  return Math.round(totalTime / resolved.length / 1000 / 60); // Return minutes
}

function exportReportAsCSV(report: any): NextResponse {
  let csv = "Analytics Report\n\n";
  csv += `Generated At,${report.generatedAt}\n`;
  csv += `Period Start,${report.period.start}\n`;
  csv += `Period End,${report.period.end}\n\n`;

  // Incidents summary
  if (report.incidents) {
    csv += "INCIDENTS SUMMARY\n";
    csv += `Total,${report.incidents.summary.total}\n`;
    Object.entries(report.incidents.summary.byStatus).forEach(([status, count]) => {
      csv += `Status: ${status},${count}\n`;
    });
    csv += "\n";
  }

  // Devices summary
  if (report.devices) {
    csv += "DEVICES SUMMARY\n";
    csv += `Total,${report.devices.summary.total}\n`;
    csv += `Active,${report.devices.summary.active}\n`;
    csv += `Disabled,${report.devices.summary.disabled}\n\n`;
  }

  // Users summary
  if (report.users) {
    csv += "USERS SUMMARY\n";
    csv += `Total,${report.users.summary.total}\n`;
    Object.entries(report.users.summary.byRole).forEach(([role, count]) => {
      csv += `Role: ${role},${count}\n`;
    });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="analytics-report-${Date.now()}.csv"`,
    },
  });
}
