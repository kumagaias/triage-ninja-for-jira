# Technical Architecture (TriageNinja)

**⚠️ File Size Limit: Maximum 1000 lines per file**

## References

- **Global Best Practices**: [kiro-best-practices](https://github.com/kumagaias/kiro-best-practices)
- **Project Standards**: `.kiro/steering/project.md`
- **Spec**: `.kiro/specs/issue-16-rovo-agent-integration/`

## Overview

**TriageNinja**: Atlassian Forge app for automated Jira ticket triage

**Stack:**
- Platform: Atlassian Forge
- Frontend: React + Forge UI Kit (@forge/react)
- Backend: Node.js + TypeScript
- AI: Forge LLM (Rovo Chat) - Claude 3.5 Sonnet
- Testing: Jest, Playwright

## Architecture

### Three-Tier Triage System

1. **Automatic**: Jira Automation + Forge LLM (on ticket creation)
2. **Manual**: UI Button → Forge LLM API → Update ticket
3. **Fallback**: Keyword-based logic (emergency only)

### Forge LLM Integration

**Key Technology**: Forge LLM (`@forge/llm`) is Atlassian's Rovo Chat API.

**Implementation**:
- Direct API calls from resolvers using `chat()` function
- Structured prompts for classification, assignee suggestion, and similar ticket search
- JSON-formatted responses for reliable parsing
- Fallback to keyword-based logic on errors

**Model**: Claude 3.5 Sonnet (via `model: 'claude'` in manifest.yml)

**EAP Requirements**:
- Early Access Program approval required
- Free until 2026-01-01
- Register at: https://go.atlassian.com/signup-forge-llms

**Frontend**: Button triggers resolver → Forge LLM → Display results

## Forge Specifics

### Manifest Key Sections

```yaml
modules:
  jira:issuePanel:
    - key: triageninja-issue-panel
  
  llm:
    - key: triageninja-llm
      model: claude

function:
  - key: resolver
    handler: index.handler

permissions:
  scopes:
    - read:jira-work
    - write:jira-work
```

### UI Kit (MUST use @forge/react only)

```typescript
import { Button, Text, Stack } from '@forge/react';

// ✅ Correct
<Stack><Text>Hello</Text><Button>Click</Button></Stack>

// ❌ Wrong
<div><button>Click</button></div>
```

### API Calls

```typescript
import api, { route } from '@forge/api';

// ✅ Preferred: User context
await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`);

// ⚠️ Caution: App context (manual auth required)
await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
```

## Data Models

```typescript
interface TicketData {
  issueKey: string;
  summary: string;
  description: string;
  reporter: { accountId: string; displayName: string };
  status: string;
  priority: string;
}

interface ClassificationResult {
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  urgency: 'Urgent' | 'Normal';
  confidence: number; // 0-100
  source: 'forge-llm-rovo' | 'keyword-based';
}

interface AssigneeSuggestion {
  assignee: { accountId: string; displayName: string };
  reason: string;
  confidence: number;
  source: 'forge-llm-rovo' | 'workload-based';
}
```

## Error Handling

```typescript
// Forge LLM with fallback
async function performAITriage(issueKey: string) {
  try {
    const result = await ForgeLlmTriage.performCompleteTriage(issueKey);
    return result;
  } catch (error) {
    console.error('Forge LLM failed:', error);
    return await classifyTicketFallback(issueKey);
  }
}
```

## Testing

```typescript
// Unit test
describe('analyzeTicketClassification', () => {
  it('should return ticket data', async () => {
    const result = await analyzeTicketClassification({ issueKey: 'SUP-123' });
    expect(result).toHaveProperty('issueKey', 'SUP-123');
  });
});

// E2E test
test('user can run AI triage', async ({ page }) => {
  await page.goto('https://site.atlassian.net/browse/SUP-123');
  await page.click('button:has-text("Run AI Triage")');
  await expect(page.locator('text=Category:')).toBeVisible();
});
```

## Deployment

**⚠️ CRITICAL: Two-Stage Build Process**

TriageNinja has separate frontend (React) and backend (TypeScript) builds:

### Frontend Deployment (React App Changes)

When modifying `static/dashboard/src/` files:

```bash
# Step 1: Build React app
cd static/dashboard && npm run build

# Step 2: Build TypeScript
cd ../.. && npm run build

# Step 3: Deploy to Forge
forge deploy --environment production --non-interactive
```

**One-liner:**
```bash
cd static/dashboard && npm run build && cd ../.. && npm run build && forge deploy --environment production --non-interactive
```

### Backend Deployment (Resolver/Action Changes)

When modifying `src/` files only:

```bash
npm run build
forge deploy --environment production --non-interactive
```

### Development vs Production

```bash
# Development
forge deploy --environment development
forge install --upgrade --environment development
forge tunnel

# Production
forge deploy --environment production
forge install --upgrade --environment production
```

**Important: Frontend vs Backend**
- **Frontend changes** (React components in `static/dashboard/src/`): Require React build + Forge deploy
- **Backend changes** (resolvers, actions): Can use `forge tunnel` for live testing
- `forge tunnel` only redirects backend function calls to local machine
- Static files (HTML/JS/CSS) are always served from deployed version

**Workflow:**
1. Frontend change → React build → TypeScript build → Deploy → Hard reload browser (Cmd+Shift+R)
2. Backend change → Use `forge tunnel` for instant testing (no deploy needed)

**Verification:**
- Check version number in UI footer (e.g., "TriageNinja v6.36.0")
- If version doesn't update, React build was skipped

**Checklist:**
- [ ] `forge lint`
- [ ] `make test`
- [ ] `make security-check`
- [ ] Deploy to dev first
- [ ] Test in dev
- [ ] Create PR
- [ ] Deploy to prod
- [ ] Monitor logs

## Monitoring

```bash
forge logs --environment development --tail
```

**Structured Logging:**
```typescript
console.log('Ticket classified', {
  issueKey: 'SUP-123',
  category: 'Network',
  confidence: 85,
  source: 'forge-llm-rovo',
  timestamp: new Date().toISOString()
});
```

**Key Metrics:**
- Forge LLM success rate
- Fallback usage rate
- Average confidence scores
- Response time
- Token usage

## Performance

```typescript
// Caching
const cache = new Map();
async function fetchWithCache(key: string) {
  if (cache.has(key)) return cache.get(key);
  const data = await fetch(key);
  cache.set(key, data);
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  return data;
}

// Parallel execution
const [issue, agents] = await Promise.all([
  fetchIssue(issueKey),
  fetchAvailableAgents()
]);
```

## Security

```typescript
// Input validation
function validateIssueKey(key: string): boolean {
  return /^[A-Z]+-\d+$/.test(key);
}

// Authorization check
async function updateIssue(issueKey: string, fields: any, accountId: string) {
  const permissions = await checkUserPermissions(issueKey, accountId);
  if (!permissions.canEdit) throw new Error('Permission denied');
  return await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ fields })
  });
}
```

## Related Documents

- **Global Best Practices**: [kiro-best-practices](https://github.com/kumagaias/kiro-best-practices)
- **Project Standards**: `project.md`
- **Spec**: `.kiro/specs/issue-16-rovo-agent-integration/`
