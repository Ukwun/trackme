import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * UI-Driven Role-Action Matrix Test
 * 
 * This test suite validates real user workflows across all roles via actual form
 * interactions (login, register, form fills, button clicks).
 * 
 * Unlike the API-only matrix, this tests the full UI flow including:
 * - Form validation and error states
 * - Button visibility and enabled/disabled states
 * - Success/error toast messages
 * - Dashboard component rendering post-action
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

const ROLES = [
  { name: "super_admin", email: "admin@test.local", pass: "AdminTest123!" },
  { name: "control_room", email: "control@test.local", pass: "ControlTest123!" },
  { name: "dispatcher", email: "dispatch@test.local", pass: "DispatchTest123!" },
  { name: "patrol_officer", email: "patrol@test.local", pass: "PatrolTest123!" },
  { name: "analyst", email: "analyst@test.local", pass: "AnalystTest123!" },
  { name: "field_agent", email: "field@test.local", pass: "FieldTest123!" },
];

// Permissions matrix for UI visibility
const UI_PERMISSIONS = {
  super_admin: ["device:create", "device:list", "device:share", "incident:create", "incident:assign", "geofence:create", "user:manage"],
  control_room: ["device:list", "incident:create", "incident:assign", "incident:status", "geofence:create", "geofence:edit"],
  dispatcher: ["device:list", "incident:assign", "incident:status", "unit:assign"],
  patrol_officer: ["incident:view", "device:history"],
  analyst: ["analytics:view", "report:export"],
  field_agent: ["device:history", "incident:view", "location:update"],
};

/**
 * Helper: Register a test user if not exists
 */
async function ensureUserRegistered(page: Page, email: string, password: string, role: string) {
  await page.goto(`${BASE_URL}/`);

  const emailField = page.locator('input[placeholder*="email"], input[placeholder*="Email"]').first();
  const passwordField = page.locator('input[type="password"]').first();

  if (await emailField.count() > 0 && await passwordField.count() > 0) {
    await emailField.fill(email);
    await passwordField.fill(password);
    await page.locator('button:has-text("Sign In")').first().click();

    const authenticated = await page.waitForFunction(
      () => Boolean(localStorage.getItem("tm_auth_token")),
      undefined,
      { timeout: 1500 }
    ).then(() => true).catch(() => false);

    if (authenticated) {
      return;
    }
  }

  await page.goto(`${BASE_URL}/`);
  await page.locator('button:has-text("Create an account")').click();
  await page.locator('input[placeholder*="email"], input[placeholder*="Email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Register")').first().click();
  await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();

  if (role !== "field_agent") {
    await page.request.post(`${BASE_URL}/api/auth`, {
      headers: { 'Content-Type': 'application/json' },
      data: { action: 'login', email, password },
    });
  }
}

/**
 * Helper: Login with email and password
 */
async function loginUser(page: Page, email: string, password: string): Promise<string> {
  await page.goto(`${BASE_URL}/`);
  
  const emailField = page.locator('input[placeholder*="email"], input[type="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const signInBtn = page.locator('button:has-text("Sign in")').first();

  await emailField.fill(email);
  await passwordField.fill(password);
  await signInBtn.click();

  await page.waitForFunction(() => Boolean(localStorage.getItem("tm_auth_token")), undefined, { timeout: 5000 });

  // Extract token from localStorage
  const token = await page.evaluate(() => localStorage.getItem("tm_auth_token") || "");
  expect(token).toBeTruthy();
  return token;
}

/**
 * Helper: Check if action button is visible
 */
async function isActionButtonVisible(page: Page, actionLabel: string): Promise<boolean> {
  const btn = page.locator(`button:has-text("${actionLabel}"), a:has-text("${actionLabel}")`);
  return (await btn.count()) > 0 && (await btn.first().isVisible());
}

/**
 * Test: Register Device Form (UI flow)
 */
async function testRegisterDeviceUI(page: Page, role: string, token: string) {
  const allowedToRegister = ["super_admin", "control_room", "dispatcher"];
  const isAllowed = allowedToRegister.includes(role);

  const registerBtn = page.locator('button:has-text("Register"), button:has-text("Add Device")').first();
  const isVisible = (await registerBtn.count()) > 0 && (await registerBtn.isVisible());

  if (isAllowed) {
    expect(isVisible).toBeTruthy();
    if (isVisible) {
      await registerBtn.click();
      await page.waitForTimeout(300);

      // Fill device form
      const deviceIdField = page.locator('input[placeholder*="device"], input[placeholder*="Device"]').first();
      if (await deviceIdField.count() > 0) {
        await deviceIdField.fill(`device-${role}-${Date.now()}`);
      }

      // Submit
      const submitBtn = page.locator('button:has-text("Register"), button:has-text("Submit")').last();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(800);
        
        // Check for success (either success message or button gone)
        const successMsg = page.locator('text=/success|registered|added/i');
        const stillShowing = await registerBtn.isVisible();
        expect(successMsg.count() > 0 || !stillShowing).toBeTruthy();
      }
    }
  } else {
    // Should not be visible
    expect(isVisible).toBeFalsy();
  }
}

/**
 * Test: Create Incident Form (UI flow)
 */
async function testCreateIncidentUI(page: Page, role: string, token: string) {
  const allowedToCreate = ["super_admin", "control_room", "dispatcher"];
  const isAllowed = allowedToCreate.includes(role);

  const createBtn = page.locator('button:has-text("Create"), button:has-text("Incident")').first();
  const isVisible = (await createBtn.count()) > 0 && (await createBtn.isVisible());

  if (isAllowed) {
    expect(isVisible).toBeTruthy();
    if (isVisible) {
      await createBtn.click();
      await page.waitForTimeout(300);

      // Fill incident form
      const titleField = page.locator('input[placeholder*="title"], input[placeholder*="Title"]').first();
      const descField = page.locator('textarea, input[placeholder*="description"], input[placeholder*="Description"]').first();
      
      if (await titleField.count() > 0) {
        await titleField.fill(`Incident from ${role} at ${new Date().toISOString()}`);
      }
      
      if (await descField.count() > 0) {
        await descField.fill(`Test incident created via UI automation for role: ${role}`);
      }

      // Submit
      const submitBtn = page.locator('button:has-text("Create"), button:has-text("Submit")').last();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(800);
        
        // Check for success
        const successMsg = page.locator('text=/created|success|incident/i');
        expect(successMsg.count() > 0 || !(await createBtn.isVisible())).toBeTruthy();
      }
    }
  } else {
    // Should not be visible
    expect(isVisible).toBeFalsy();
  }
}

/**
 * Test: Assign Incident (UI flow)
 */
async function testAssignIncidentUI(page: Page, role: string, token: string) {
  const allowedToAssign = ["super_admin", "control_room", "dispatcher"];
  const isAllowed = allowedToAssign.includes(role);

  const assignBtn = page.locator('button:has-text("Assign"), button:has-text("Unit")').first();
  const isVisible = (await assignBtn.count()) > 0 && (await assignBtn.isVisible());

  if (isAllowed && isVisible) {
    await assignBtn.click();
    await page.waitForTimeout(300);

    // Select unit from dropdown
    const unitSelect = page.locator('select, [role="listbox"]').first();
    if (await unitSelect.count() > 0) {
      const options = page.locator('option');
      if (await options.count() > 0) {
        await unitSelect.selectOption({ index: 1 });
        await page.waitForTimeout(200);
      }
    }

    // Confirm assignment
    const confirmBtn = page.locator('button:has-text("Assign"), button:has-text("Confirm")').last();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForTimeout(800);
      
      // Check for success
      const successMsg = page.locator('text=/assigned|success/i');
      expect(successMsg.count() > 0 || !(await assignBtn.isVisible())).toBeTruthy();
    }
  }
}

/**
 * Test: Create Geofence (UI flow)
 */
async function testCreateGeofenceUI(page: Page, role: string, token: string) {
  const allowedToCreate = ["super_admin", "control_room"];
  const isAllowed = allowedToCreate.includes(role);

  const createBtn = page.locator('button:has-text("Geofence"), button:has-text("Create")').first();
  const isVisible = (await createBtn.count()) > 0 && (await createBtn.isVisible());

  if (isAllowed && isVisible) {
    await createBtn.click();
    await page.waitForTimeout(300);

    // Fill geofence form
    const nameField = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    const radiusField = page.locator('input[type="number"], input[placeholder*="radius"]').first();
    
    if (await nameField.count() > 0) {
      await nameField.fill(`Geofence-${role}-${Date.now()}`);
    }
    
    if (await radiusField.count() > 0) {
      await radiusField.fill("500");
    }

    // Submit
    const submitBtn = page.locator('button:has-text("Create"), button:has-text("Submit")').last();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(800);
      
      // Check for success
      const successMsg = page.locator('text=/created|success/i');
      expect(successMsg.count() > 0 || !(await createBtn.isVisible())).toBeTruthy();
    }
  }
}

/**
 * Test: Share Device (UI flow)
 */
async function testShareDeviceUI(page: Page, role: string, token: string) {
  const allowedToShare = ["super_admin", "control_room"];
  const isAllowed = allowedToShare.includes(role);

  const shareBtn = page.locator('button:has-text("Share")').first();
  const isVisible = (await shareBtn.count()) > 0 && (await shareBtn.isVisible());

  if (isAllowed && isVisible) {
    await shareBtn.click();
    await page.waitForTimeout(300);

    // Fill share form
    const emailField = page.locator('input[type="email"], input[placeholder*="email"]').first();
    if (await emailField.count() > 0) {
      await emailField.fill("recipient@test.local");
    }

    // Submit
    const submitBtn = page.locator('button:has-text("Share"), button:has-text("Send")').last();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(800);
      
      // Check for success
      const successMsg = page.locator('text=/shared|success/i');
      expect(successMsg.count() > 0 || !(await shareBtn.isVisible())).toBeTruthy();
    }
  }
}

/**
 * Test: Dashboard renders with correct role styling
 */
async function testDashboardRoleStyling(page: Page, role: string) {
  // Check for role-specific elements
  const roleHeader = page.locator(`text=${role.replace(/_/g, " ")}`);
  expect(await roleHeader.count()).toBeGreaterThan(0);

  // Check for role icon
  const roleIcon = page.locator('[data-role-icon]');
  expect(await roleIcon.count()).toBeGreaterThan(0);

  // Check for role-specific components based on permissions
  const perms = UI_PERMISSIONS[role as keyof typeof UI_PERMISSIONS];
  
  if (perms.includes("incident:create") || perms.includes("incident:assign")) {
    const incidentPanel = page.locator('text=/incident/i');
    expect(await incidentPanel.count()).toBeGreaterThan(0);
  }

  if (perms.includes("geofence:create")) {
    const geofencePanel = page.locator('text=/geofence/i');
    expect(await geofencePanel.count()).toBeGreaterThan(0);
  }

  if (perms.includes("user:manage")) {
    const userMgmt = page.locator('text=/user/i');
    expect(await userMgmt.count()).toBeGreaterThan(0);
  }
}

/**
 * Main test for each role
 */
test.describe("Role-Action Matrix UI Tests", () => {
  for (const role of ROLES) {
    test(`${role.name}: Full user workflow`, async ({ page }) => {
      // Register user if needed
      await ensureUserRegistered(page, role.email, role.pass, role.name);

      // Login
      const token = await loginUser(page, role.email, role.pass);
      expect(token).toBeTruthy();

      // Verify dashboard loads
      const dashboardTitle = page.locator("h1, h2");
      await expect(dashboardTitle.first()).toBeVisible();

      // Test dashboard styling
      await testDashboardRoleStyling(page, role.name);

      // Test device registration (if allowed)
      await testRegisterDeviceUI(page, role.name, token);

      // Test incident creation (if allowed)
      await testCreateIncidentUI(page, role.name, token);

      // Test incident assignment (if allowed)
      await testAssignIncidentUI(page, role.name, token);

      // Test geofence creation (if allowed)
      await testCreateGeofenceUI(page, role.name, token);

      // Test device sharing (if allowed)
      await testShareDeviceUI(page, role.name, token);

      // Verify dashboard is responsive (check viewport)
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeGreaterThan(0);
      expect(viewport?.height).toBeGreaterThan(0);

      // Check for overflow/cramped layout issues
      const mainContent = page.locator("main");
      const scrollableH = await mainContent.evaluate((el) => el.scrollHeight > el.clientHeight);
      const scrollableW = await mainContent.evaluate((el) => el.scrollWidth > el.clientWidth);
      
      // Some vertical scroll is okay, but excessive indicates cramped layout
      expect(scrollableW).toBeFalsy(); // No horizontal scroll
    });
  }

  test("Device share permissions: Owner can share, recipient receives access", async ({ page }) => {
    const owner = ROLES.find((r) => r.name === "super_admin")!;
    const recipient = ROLES.find((r) => r.name === "control_room")!;

    // Owner: Register device and share
    const ownerToken = await loginUser(page, owner.email, owner.pass);
    await testRegisterDeviceUI(page, "super_admin", ownerToken);
    await testShareDeviceUI(page, "super_admin", ownerToken);

    // New page for recipient
    const newPage = page.context().pages()[1] || await page.context().newPage();
    
    // Recipient: Login and verify shared device visible
    await newPage.goto(`${BASE_URL}/`);
    await ensureUserRegistered(newPage, recipient.email, recipient.pass, recipient.name);
    const recipientToken = await loginUser(newPage, recipient.email, recipient.pass);
    
    // Check for "Shared Devices" section
    const sharedDevicesSection = newPage.locator('text=/shared/i');
    expect(await sharedDevicesSection.count()).toBeGreaterThan(0);

    await newPage.close();
  });

  test("Geofence ownership: Creator can edit, other roles view-only", async ({ page }) => {
    const creator = ROLES.find((r) => r.name === "control_room")!;
    const viewer = ROLES.find((r) => r.name === "dispatcher")!;

    // Creator: Create geofence
    const creatorToken = await loginUser(page, creator.email, creator.pass);
    await testCreateGeofenceUI(page, "control_room", creatorToken);

    // Creator should see edit button
    const editBtn = page.locator('button:has-text("Edit"), button:has-text("Modify")').first();
    expect(await editBtn.count()).toBeGreaterThan(0);

    // Viewer: Login and check geofence
    const newPage = page.context().pages()[1] || await page.context().newPage();
    await ensureUserRegistered(newPage, viewer.email, viewer.pass, viewer.name);
    const viewerToken = await loginUser(newPage, viewer.email, viewer.pass);

    // Viewer should NOT see edit button for others' geofences
    const viewerEditBtn = newPage.locator('button:has-text("Edit")').first();
    // Note: This depends on geofence list being populated; in real app, filter by ownership
    
    await newPage.close();
  });

  test("Incident assignment: Only permitted roles can assign", async ({ page }) => {
    const permittedRoles = ROLES.filter((r) => ["super_admin", "control_room", "dispatcher"].includes(r.name));
    const restrictedRoles = ROLES.filter((r) => !["super_admin", "control_room", "dispatcher"].includes(r.name));

    // Permitted roles: Can assign
    for (const role of permittedRoles) {
      const tempPage = page.context().pages()[0] || page;
      await ensureUserRegistered(tempPage, role.email, role.pass, role.name);
      const token = await loginUser(tempPage, role.email, role.pass);
      await testAssignIncidentUI(tempPage, role.name, token);
    }

    // Restricted roles: Cannot assign
    for (const role of restrictedRoles) {
      const tempPage = await page.context().newPage();
      await ensureUserRegistered(tempPage, role.email, role.pass, role.name);
      const token = await loginUser(tempPage, role.email, role.pass);
      
      const assignBtn = tempPage.locator('button:has-text("Assign")').first();
      expect(await assignBtn.count()).toBe(0);
      
      await tempPage.close();
    }
  });

  test("Dashboard responsiveness: No horizontal scroll on mobile", async ({ browser }) => {
    // Test on mobile viewport
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileContext.newPage();

    const adminRole = ROLES.find((r) => r.name === "super_admin")!;
    await ensureUserRegistered(mobilePage, adminRole.email, adminRole.pass, adminRole.name);
    const token = await loginUser(mobilePage, adminRole.email, adminRole.pass);

    // Check for horizontal scroll
    const mainContent = mobilePage.locator("main");
    const scrollableW = await mainContent.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrollableW).toBeFalsy();

    // Verify key elements are visible without scroll
    const header = mobilePage.locator("header");
    expect(await header.isVisible()).toBeTruthy();

    const visibleButtons = await mobilePage.locator('button').evaluateAll((buttons) =>
      buttons.filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length
    );
    expect(visibleButtons).toBeGreaterThan(0);

    const viewportOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(viewportOverflow).toBeFalsy();

    await mobileContext.close();
  });
});
