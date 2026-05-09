import { test, expect } from '@playwright/test';

test.describe('TrackMe Real-Time Dashboard Smoke Test', () => {
  test('Home page loads and shows login/register', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByText('Live operations platform')).toBeVisible();
  });

  test('Field agent can register and start an authenticated session', async ({ page }) => {
    const email = `smoke-${Date.now()}@trackme.test`;

    await page.goto('/');
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('SmokePass123!');

    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/auth') && response.request().method() === 'POST' && response.ok()),
      page.getByRole('button', { name: 'Register' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('SmokePass123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForFunction(() => Boolean(window.localStorage.getItem('tm_auth_token')));
    await expect(page.getByRole('heading', { name: 'Field Agent' })).toBeVisible();
    await expect(page.getByText('Task tracking and location reporting')).toBeVisible();
  });

  test('Mobile landing page keeps auth card within viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const authCard = page.locator('form');
    await expect(authCard).toBeVisible();

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowX).toBeFalsy();

    const cardBox = await authCard.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeLessThanOrEqual(390);
  });
});
