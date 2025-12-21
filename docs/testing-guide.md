# Testing Guide for TriageNinja

## Overview

This guide covers testing strategies for TriageNinja, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
src/
├── actions/__tests__/
│   └── rovoActions.test.ts       # Rovo action tests
├── resolvers/__tests__/
│   ├── dashboardResolver.test.ts # Dashboard resolver tests (TODO)
│   └── issuePanelResolver.test.ts # Issue panel resolver tests (TODO)
├── services/__tests__/
│   ├── jiraClient.test.ts        # Jira API client tests
│   └── rovoAgent.test.ts         # Rovo Agent service tests
└── utils/__tests__/
    └── helpers.test.ts            # Utility function tests

e2e/
└── triage-flow.spec.ts            # End-to-end tests
```

## Running Tests

### All Tests

```bash
# Run all tests (unit + security)
make test

# Run with coverage
npm run test:coverage
```

### Unit Tests Only

```bash
# Run unit tests
make test-unit

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Security Tests

```bash
# Run security checks
make security-check
```

## Unit Testing

### Testing Rovo Actions

Rovo actions are tested with mocked Jira API calls:

```typescript
import { analyzeTicketClassification } from '../rovoActions';
import { JiraClient } from '../../services/jiraClient';

jest.mock('../../services/jiraClient');

describe('analyzeTicketClassification', () => {
  it('should return structured ticket data', async () => {
    const mockIssueData = {
      key: 'TEST-123',
      fields: {
        summary: 'Cannot connect to VPN',
        description: 'VPN connection fails...',
        // ...
      }
    };

    (JiraClient.getIssue as jest.Mock).mockResolvedValue({
      ok: true,
      data: mockIssueData
    });

    const result = await analyzeTicketClassification(
      { issueKey: 'TEST-123' },
      { accountId: 'test-user' }
    );

    expect(result).toMatchObject({
      issueKey: 'TEST-123',
      summary: 'Cannot connect to VPN',
      // ...
    });
  });
});
```

### Testing Utilities

Utility functions are tested with various input scenarios:

```typescript
import { escapeJqlText } from '../helpers';

describe('escapeJqlText', () => {
  it('should escape double quotes', () => {
    expect(escapeJqlText('test"value')).toBe('test\\"value');
  });

  it('should escape backslashes', () => {
    expect(escapeJqlText('test\\value')).toBe('test\\\\value');
  });
});
```

## Integration Testing

### Testing with Forge Tunnel

1. Start Forge tunnel:
```bash
forge tunnel
```

2. Test in actual Jira instance:
   - Create test tickets
   - Click "Run AI Triage" button
   - Verify results
   - Check Forge logs

3. Monitor logs:
```bash
forge logs --tail
```

### Testing Automation Rules

#### Manual Testing Steps

1. **Create Test Tickets**
   ```
   Summary: "Cannot connect to VPN from home"
   Description: "Getting authentication failed error"
   Type: Support Request
   Assignee: (empty)
   ```

2. **Test Automatic Triage**
   - Create new ticket
   - Wait 5-10 seconds
   - Verify automation runs
   - Check ticket fields updated
   - Check labels added

3. **Test Manual Triage**
   - Open existing ticket
   - Click "Run AI Triage" button
   - Wait for completion (30s max)
   - Verify results displayed
   - Check ticket updated

4. **Test Fallback**
   - Disable Rovo Agent temporarily
   - Trigger manual triage
   - Verify fallback logic runs
   - Check error handling

#### Verification Checklist

- [ ] Automation rule triggers correctly
- [ ] Rovo Agent is invoked
- [ ] All three actions execute
- [ ] Ticket fields are updated:
  - [ ] Assignee
  - [ ] Priority
  - [ ] Labels (ai-triaged, ai-category, ai-subcategory, ai-confidence)
- [ ] Trigger label removed (manual triage only)
- [ ] No errors in Forge logs
- [ ] No errors in Jira Automation audit log

## E2E Testing

### Playwright Tests

E2E tests use Playwright to test the full user flow:

```typescript
import { test, expect } from '@playwright/test';

test('user can run AI triage', async ({ page }) => {
  // Navigate to issue
  await page.goto('https://site.atlassian.net/browse/SUP-123');
  
  // Click AI Triage button
  await page.click('button:has-text("Run AI Triage")');
  
  // Wait for results
  await expect(page.locator('text=Category:')).toBeVisible({ timeout: 35000 });
  
  // Verify results displayed
  await expect(page.locator('text=Confidence:')).toBeVisible();
  await expect(page.locator('text=Suggested Assignee:')).toBeVisible();
});
```

### Running E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/triage-flow.spec.ts
```

## Test Coverage Goals

### Current Coverage

- **Rovo Actions**: 100% (all functions tested)
- **Utilities**: 100% (all functions tested)
- **Services**: 90%+ (core logic tested)
- **Resolvers**: 0% (TODO: add tests)

### Target Coverage

- **Overall**: 80%+
- **Critical Paths**: 100%
- **Error Handling**: 100%

## Testing Rovo Actions Manually

### Using Forge CLI

You can test Rovo actions directly using Forge CLI:

```bash
# Test analyze-ticket-classification
forge invoke --function analyzeTicketClassification --payload '{"issueKey":"SUP-123"}'

# Test suggest-ticket-assignee
forge invoke --function suggestTicketAssignee --payload '{"issueKey":"SUP-123","category":"Network"}'

# Test find-similar-tickets
forge invoke --function findSimilarTickets --payload '{"issueKey":"SUP-123"}'
```

### Using Jira Automation

1. Create a test automation rule
2. Add action: "Invoke Rovo Agent"
3. Select TriageNinja action
4. Provide test payload
5. Run rule manually
6. Check audit log for results

## Common Test Scenarios

### Scenario 1: New Ticket Automatic Triage

**Setup**:
- Automation rule enabled
- Rovo Agent available

**Steps**:
1. Create new ticket (type: Support Request, assignee: empty)
2. Wait 10 seconds
3. Refresh ticket

**Expected**:
- Assignee assigned
- Priority updated
- Labels added: ai-triaged, ai-category:*, ai-subcategory:*, ai-confidence:*

### Scenario 2: Manual Triage Button

**Setup**:
- Existing ticket
- Manual triage automation rule enabled

**Steps**:
1. Open ticket
2. Click "Run AI Triage" button
3. Wait for completion (progress bar)
4. Review results

**Expected**:
- Results displayed within 30 seconds
- Category, priority, assignee shown
- Confidence score displayed
- Similar tickets listed

### Scenario 3: Fallback Logic

**Setup**:
- Rovo Agent unavailable or timeout

**Steps**:
1. Trigger manual triage
2. Wait for timeout (30s)
3. Observe fallback

**Expected**:
- Fallback to keyword-based classification
- Results still displayed
- Error logged but not shown to user
- System remains functional

### Scenario 4: Error Handling

**Setup**:
- Invalid issue key or API error

**Steps**:
1. Trigger triage with invalid data
2. Observe error handling

**Expected**:
- User-friendly error message
- Error logged with context
- System recovers gracefully
- No data corruption

## Debugging Tests

### View Test Output

```bash
# Verbose output
npm test -- --verbose

# Show console logs
npm test -- --silent=false
```

### Debug Specific Test

```typescript
// Add .only to run single test
it.only('should test specific scenario', async () => {
  // test code
});

// Add console.log for debugging
console.log('Debug info:', result);
```

### Check Forge Logs

```bash
# Tail logs in real-time
forge logs --tail

# Filter by function
forge logs | grep "analyzeTicketClassification"

# Filter by error
forge logs | grep "ERROR"
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Manual workflow dispatch

### CI Pipeline

1. Lint code
2. Run unit tests
3. Run security checks
4. Build app
5. Deploy to staging (optional)
6. Run E2E tests (optional)

## Best Practices

### Writing Tests

1. **Test Behavior, Not Implementation**
   - Focus on what the function does, not how
   - Test public API, not internal details

2. **Use Descriptive Names**
   ```typescript
   // Good
   it('should return error when issueKey is missing')
   
   // Bad
   it('test1')
   ```

3. **Follow AAA Pattern**
   - Arrange: Set up test data
   - Act: Execute function
   - Assert: Verify results

4. **Mock External Dependencies**
   - Mock Jira API calls
   - Mock Rovo Agent responses
   - Use consistent mock data

5. **Test Edge Cases**
   - Empty inputs
   - Null/undefined values
   - Large datasets
   - Error conditions

### Maintaining Tests

1. **Keep Tests Fast**
   - Use mocks instead of real API calls
   - Avoid unnecessary delays
   - Run tests in parallel

2. **Keep Tests Independent**
   - Each test should run in isolation
   - No shared state between tests
   - Clean up after each test

3. **Update Tests with Code**
   - Update tests when changing functionality
   - Add tests for new features
   - Remove tests for removed features

## Troubleshooting

### Tests Failing Locally

1. Clear Jest cache:
   ```bash
   npm test -- --clearCache
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check Node version:
   ```bash
   node --version  # Should be 24.x or 22.x
   ```

### E2E Tests Failing

1. Update Playwright:
   ```bash
   npx playwright install
   ```

2. Check Jira site accessibility
3. Verify test credentials
4. Check network connectivity

### Forge Tests Failing

1. Redeploy app:
   ```bash
   forge deploy
   ```

2. Check Forge status:
   ```bash
   forge status
   ```

3. Verify permissions in manifest.yml

## Related Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Forge Testing Guide](https://developer.atlassian.com/platform/forge/testing/)
- [Rovo Integration Guide](./rovo-integration.md)
