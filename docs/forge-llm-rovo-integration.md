# Forge LLM (Rovo) Integration

## Overview

TriageNinja uses **Forge LLM (Rovo)** for AI-powered ticket triage. This provides instant, intelligent classification and assignee suggestions without requiring manual Automation Rule setup.

## Architecture

```
User clicks "Triage" button
         ↓
Frontend calls runAITriage resolver
         ↓
Backend calls Forge LLM API (@forge/llm)
         ↓
Claude AI analyzes ticket
         ↓
Returns classification + assignee suggestion
         ↓
User reviews and applies results
```

## Implementation

### 1. Manifest Configuration

```yaml
modules:
  llm:
    - key: triageninja-llm
      model:
        - claude
```

### 2. Service Layer

**File:** `src/services/forgeLlmTriage.ts`

Key functions:
- `classifyTicketWithLLM()` - Ticket classification
- `suggestAssigneeWithLLM()` - Assignee suggestion
- `performCompleteTriage()` - Complete triage workflow

### 3. Resolver Integration

**File:** `src/resolvers/dashboardResolver.ts`

```typescript
dashboardResolver.define('runAITriage', async (req) => {
  // Use Forge LLM for complete triage
  const triageResult = await ForgeLlmTriage.performCompleteTriage(
    ticketData,
    projectMembers
  );
  
  return {
    category: triageResult.category,
    priority: triageResult.priority,
    suggestedAssignee: triageResult.suggestedAssignee,
    source: 'forge-llm-rovo'
  };
});
```

## Features

### Ticket Classification

Analyzes:
- Summary and description
- Reporter information
- Creation timestamp

Returns:
- Category (Network, Hardware, Software, etc.)
- Sub-category
- Priority (Highest/High/Medium/Low/Lowest)
- Urgency (Urgent/Normal)
- Confidence score (0-100)
- Reasoning

### Assignee Suggestion

Considers:
- Ticket category and priority
- Team member workload
- Current ticket distribution

Returns:
- Suggested assignee
- Reason for suggestion
- Confidence score
- Alternative assignees (if applicable)

## EAP Access

Forge LLM is currently in **Early Access Program (EAP)**.

### Registration

1. Visit: https://go.atlassian.com/signup-forge-llms
2. Provide app details:
   - App name: TriageNinja
   - Description: AI-powered Jira ticket triage automation
3. Wait for approval (usually within 24-48 hours)

### EAP Terms

- **Free during EAP** - No charges until 2026-01-01
- **Usage limits** - Subject to Atlassian-defined limits
- **Testing purpose** - Intended for development/testing
- **AWS Bedrock** - Backend processing via AWS
- **Moderation** - Atlassian applies safety filters

### Post-EAP

- **Billing starts:** January 1, 2026
- **Pricing:** To be announced
- **Billable Capability:** Charged per usage

## Fallback Mechanism

If Forge LLM fails, TriageNinja automatically falls back to keyword-based classification:

```typescript
try {
  // Try Forge LLM
  const result = await ForgeLlmTriage.performCompleteTriage(...);
  return { ...result, source: 'forge-llm-rovo' };
} catch (error) {
  // Fallback to keyword-based
  const result = await RovoAgent.classifyTicket(...);
  return { ...result, source: 'keyword-fallback' };
}
```

## Model Configuration

**Current model:** Claude 3.5 Haiku (via Forge LLM)

**Settings:**
- Temperature: 0.3 (consistent classification)
- Max tokens: 500 (classification), 300 (assignee)
- Response format: JSON

## Token Usage

Forge LLM tracks token usage:

```typescript
const response = await chat({
  model: 'claude-3-5-haiku-20241022',
  messages: [...],
  temperature: 0.3,
  max_completion_tokens: 500
});

// Log token usage
if (response.usage) {
  console.log('Token usage:', response.usage);
}
```

## Testing

### Local Testing

```bash
# Start tunnel
forge tunnel

# Test triage
# Click "Triage" button in dashboard
# Check logs for Forge LLM calls
```

### Logs

```bash
forge logs --environment development --tail
```

Look for:
- `[forgeLlmTriage] Classifying ticket with Forge LLM`
- `[forgeLlmTriage] LLM response received`
- `[forgeLlmTriage] Token usage: {...}`

## Troubleshooting

### EAP Not Approved

**Error:** `Forge LLM extension isn't enabled for this app`

**Solution:** 
1. Check EAP registration status
2. Wait for approval email
3. Use keyword-based fallback in the meantime

### Token Limit Exceeded

**Error:** `Token limit exceeded`

**Solution:**
1. Reduce prompt length
2. Decrease max_completion_tokens
3. Contact Atlassian for limit increase

### Invalid Response Format

**Error:** `Could not parse LLM response`

**Solution:**
1. Check prompt instructions
2. Verify JSON parsing logic
3. Add response validation

## Best Practices

1. **Prompt Engineering**
   - Clear, specific instructions
   - JSON format specification
   - Example outputs

2. **Error Handling**
   - Always implement fallback
   - Log errors for debugging
   - Provide user-friendly messages

3. **Token Optimization**
   - Minimize prompt length
   - Use appropriate max_tokens
   - Cache common responses (if applicable)

4. **Monitoring**
   - Track token usage
   - Monitor success/failure rates
   - Log confidence scores

## Related Files

- `src/services/forgeLlmTriage.ts` - Forge LLM service
- `src/resolvers/dashboardResolver.ts` - Triage resolver
- `manifest.yml` - LLM module configuration
- `docs/rovo-pricing-info.md` - Pricing details

## References

- [Forge LLM Documentation](https://developer.atlassian.com/platform/forge/)
- [EAP Signup](https://go.atlassian.com/signup-forge-llms)
- [Atlassian Developer Terms](https://www.atlassian.com/legal/atlassian-developer-terms)
