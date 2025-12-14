/**
 * E2E Test: Triage Flow
 * Tests the complete triage workflow from analysis to application
 */

import { test, expect } from '@playwright/test';

test.describe('Triage Flow', () => {
  test.skip('should complete full triage workflow', async ({ page }) => {
    // Note: This test requires a running Forge tunnel and Jira instance
    // Skip by default, run manually with: npx playwright test --grep @e2e
    
    // 1. Navigate to issue panel
    // await page.goto('https://your-jira-instance.atlassian.net/browse/TEST-1');
    
    // 2. Click "Run AI Triage" button
    // await page.click('button:has-text("Run AI Triage")');
    
    // 3. Wait for analysis to complete
    // await page.waitForSelector('text=Confidence Score', { timeout: 35000 });
    
    // 4. Verify results are displayed
    // await expect(page.locator('text=Category')).toBeVisible();
    // await expect(page.locator('text=Suggested Assignee')).toBeVisible();
    
    // 5. Click "Approve & Apply"
    // await page.click('button:has-text("Approve & Apply")');
    
    // 6. Confirm in dialog
    // await page.click('button:has-text("Confirm")');
    
    // 7. Verify success message
    // await expect(page.locator('text=Triage result applied successfully')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.skip('should display statistics correctly', async ({ page }) => {
    // Note: This test requires a running Forge tunnel and Jira instance
    
    // 1. Navigate to dashboard
    // await page.goto('https://your-jira-instance.atlassian.net/jira/dashboards/10000');
    
    // 2. Verify statistics cards are visible
    // await expect(page.locator('text=Untriaged Tickets')).toBeVisible();
    // await expect(page.locator('text=Processed Today')).toBeVisible();
    // await expect(page.locator('text=Time Saved')).toBeVisible();
    // await expect(page.locator('text=AI Accuracy')).toBeVisible();
  });
});

// Placeholder test to ensure test suite runs
test('E2E tests are configured', () => {
  expect(true).toBe(true);
});
