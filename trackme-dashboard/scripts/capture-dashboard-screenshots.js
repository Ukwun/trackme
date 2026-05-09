const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const roles = [
  { key: 'super_admin', email: 'admin@test.local', password: 'AdminTest123!', label: 'Super Admin' },
  { key: 'control_room', email: 'control@test.local', password: 'ControlTest123!', label: 'Control Room' },
  { key: 'dispatcher', email: 'dispatch@test.local', password: 'DispatchTest123!', label: 'Dispatcher' },
  { key: 'patrol_officer', email: 'patrol@test.local', password: 'PatrolTest123!', label: 'Patrol Officer' },
  { key: 'analyst', email: 'analyst@test.local', password: 'AnalystTest123!', label: 'Analyst' },
  { key: 'field_agent', email: 'field@test.local', password: 'FieldTest123!', label: 'Field Agent' },
];

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tablet', width: 1024, height: 1366 },
  { key: 'mobile', width: 390, height: 844 },
];

async function registerIfNeeded(request, role) {
  await request.post(`${BASE_URL}/api/auth`, {
    data: { action: 'register', email: role.email, password: role.password, role: role.key },
  });
}

async function login(request, role) {
  const response = await request.post(`${BASE_URL}/api/auth`, {
    data: { action: 'login', email: role.email, password: role.password },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Login failed for ${role.key}: ${response.status()} ${text}`);
  }

  const data = await response.json();
  if (!data.token || !data.role) {
    throw new Error(`Invalid login payload for ${role.key}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function capture() {
  const outputDir = path.join(process.cwd(), 'artifacts', 'dashboard-screenshots', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const apiContext = await browser.newContext();
  const request = apiContext.request;

  for (const role of roles) {
    await registerIfNeeded(request, role);
    const { token, role: authRole } = await login(request, role);

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addInitScript(
        ({ t, r }) => {
          window.localStorage.setItem('tm_auth_token', t);
          window.localStorage.setItem('tm_auth_role', r);
        },
        { t: token, r: authRole }
      );

      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
      await page.waitForSelector('main, [role="main"], h1', { timeout: 20000 });
      await page.waitForTimeout(800);

      const h1 = page.locator('h1').first();
      const heading = (await h1.textContent())?.trim() || '';
      const fileName = `${role.key}__${viewport.key}.png`;
      const filePath = path.join(outputDir, fileName);

      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`[capture] ${fileName} heading='${heading}'`);

      await context.close();
    }
  }

  await apiContext.close();
  await browser.close();
  console.log(`[done] screenshots saved to ${outputDir}`);
}

capture().catch((err) => {
  console.error('[error]', err.message);
  process.exit(1);
});
