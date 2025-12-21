# Rovo Agent Integration Guide

## Overview

TriageNinja integrates with Atlassian Rovo Agent to provide AI-powered ticket triage. This document explains the architecture, setup process, and best practices.

## Architecture

### Three-Tier Triage System

TriageNinja implements a three-tier approach to ticket triage:

1. **Automatic Triage** (Tier 1)
   - Triggers: When a new ticket is created
   - Process: Jira Automation → Rovo Agent → Update ticket
   - Use case: Immediate triage for all new tickets

2. **Manual Triage** (Tier 2)
   - Triggers: User clicks "Run AI Triage" button
   - Process: Add label → Jira Automation → Rovo Agent → Update ticket → Remove label
   - Use case: On-demand triage for existing tickets

3. **Fallback Triage** (Tier 3)
   - Triggers: When Rovo Agent is unavailable
   - Process: Keyword-based classification
   - Use case: Emergency fallback to ensure system availability

### Data Flow

```
┌─────────────────┐
│  New Ticket     │
│  or             │
│  Manual Trigger │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Jira Automation │
│ Rule            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rovo Agent      │
│ (3 Actions)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Ticket   │
│ Fields & Labels │
└─────────────────┘
```

## Rovo Actions

TriageNinja provides three Rovo Actions for ticket analysis:

### 1. analyze-ticket-classification

**Purpose**: Fetch ticket data and provide context for classification

**Input**:
- `issueKey` (string, required): Jira issue key (e.g., "SUP-123")

**Output**:
```json
{
  "issueKey": "SUP-123",
  "summary": "Cannot connect to VPN",
  "description": "VPN connection fails...",
  "reporter": "John Doe",
  "reporterEmail": "john@example.com",
  "created": "2025-12-20T10:00:00Z",
  "currentPriority": "Medium",
  "currentStatus": "Open",
  "labels": ["network", "vpn"],
  "context": {
    "hasDescription": true,
    "descriptionLength": 150,
    "summaryLength": 25,
    "age": 2
  }
}
```

### 2. suggest-ticket-assignee

**Purpose**: Get available agents with workload information

**Input**:
- `issueKey` (string, required): Jira issue key
- `category` (string, required): Ticket category

**Output**:
```json
{
  "issueKey": "SUP-123",
  "category": "Network",
  "projectKey": "SUP",
  "availableAgents": [
    {
      "accountId": "user123",
      "displayName": "Jane Smith",
      "emailAddress": "jane@example.com",
      "currentLoad": 5,
      "active": true
    }
  ],
  "totalAgents": 10,
  "recommendation": {
    "accountId": "user123",
    "displayName": "Jane Smith",
    "currentLoad": 5,
    "reasoning": "Lowest workload (5 open tickets)"
  }
}
```

### 3. find-similar-tickets

**Purpose**: Search for similar resolved tickets

**Input**:
- `issueKey` (string, required): Jira issue key

**Output**:
```json
{
  "issueKey": "SUP-123",
  "currentTicket": {
    "summary": "VPN connection problem",
    "description": "Cannot connect...",
    "projectKey": "SUP"
  },
  "similarTickets": [
    {
      "key": "SUP-100",
      "summary": "VPN authentication failed",
      "description": "Similar issue...",
      "resolution": "Fixed",
      "resolutionDate": "2025-12-15T10:00:00Z",
      "assignee": "Jane",
      "status": "Done",
      "similarityScore": 85
    }
  ],
  "totalFound": 3,
  "searchKeywords": "VPN connection problem"
}
```

## Setup Instructions

### Prerequisites

1. Atlassian Forge app deployed
2. Rovo Agent enabled in your Atlassian instance
3. Jira Automation available (Premium or higher)

### Step 1: Deploy Forge App

```bash
forge deploy --environment production
forge install --upgrade --environment production
```

### Step 2: Create Automation Rules

See [Automation Rules Documentation](./automation-rules.md) for detailed setup instructions.

#### Automatic Triage Rule

1. Go to Jira Settings → System → Automation
2. Click "Create rule"
3. Select trigger: "Issue created"
4. Add condition: Issue type is one of [Support Request, Bug, Task]
5. Add condition: Assignee is empty
6. Add action: "Invoke Rovo Agent"
   - Agent: TriageNinja Rovo Agent
   - Prompt: See template in `docs/automation-rule-templates/automatic-triage.json`
7. Add action: "Edit issue"
   - Update fields based on Rovo Agent output
8. Name the rule: "TriageNinja - Auto-Triage New Tickets"
9. Turn on the rule

#### Manual Triage Rule

1. Go to Jira Settings → System → Automation
2. Click "Create rule"
3. Select trigger: "Issue updated"
4. Add condition: Labels contains "run-ai-triage"
5. Add action: "Invoke Rovo Agent"
   - Agent: TriageNinja Rovo Agent
   - Prompt: See template in `docs/automation-rule-templates/manual-triage.json`
6. Add action: "Edit issue"
   - Update fields based on Rovo Agent output
7. Add action: "Edit issue"
   - Remove label "run-ai-triage"
8. Name the rule: "TriageNinja - Manual Triage on Label"
9. Turn on the rule

### Step 3: Verify Setup

1. Create a test ticket
2. Check if automatic triage runs
3. Verify ticket fields are updated
4. Test manual triage by clicking "Run AI Triage" button
5. Check Forge logs: `forge logs --environment production --tail`

## Troubleshooting

### Automation Rule Not Triggering

**Symptoms**: New tickets are not being triaged automatically

**Solutions**:
1. Check if automation rule is enabled
2. Verify conditions match your ticket types
3. Check Jira Automation audit log for errors
4. Verify Rovo Agent is available

### Rovo Agent Not Responding

**Symptoms**: Automation runs but fields are not updated

**Solutions**:
1. Check Rovo Agent status in Atlassian admin
2. Verify smart value paths in automation rule
3. Check Forge logs for action invocation errors
4. Test actions manually using Forge CLI

### Manual Triage Not Working

**Symptoms**: Button click does not trigger triage

**Solutions**:
1. Check browser console for errors
2. Verify label "run-ai-triage" is added to ticket
3. Check if automation rule is triggered (audit log)
4. Verify label is removed after completion
5. Check Forge logs for resolver errors

### Fallback Always Used

**Symptoms**: System always uses keyword-based triage

**Solutions**:
1. Verify Rovo Agent is properly configured
2. Check automation rules are enabled
3. Verify Forge app has correct permissions
4. Check network connectivity to Rovo Agent

## Monitoring

### Metrics to Track

1. **Success Rate**: Percentage of successful Rovo Agent calls
2. **Fallback Rate**: Percentage of times fallback is used
3. **Average Confidence**: Average confidence score from AI
4. **Response Time**: Time taken for triage to complete

### Viewing Metrics

Metrics are logged hourly to Forge logs:

```bash
forge logs --environment production | grep "\[Metrics\]"
```

### Example Metrics Output

```json
{
  "timestamp": "2025-12-21T10:00:00Z",
  "rovoAgent": {
    "totalCalls": 150,
    "successful": 142,
    "failed": 8,
    "successRate": "94.67%"
  },
  "fallback": {
    "totalUsage": 8,
    "fallbackRate": "5.06%",
    "reasons": {
      "timeout": 3,
      "network-error": 2,
      "service-unavailable": 3
    }
  },
  "confidence": {
    "average": "87.45",
    "samples": 142
  }
}
```

## Best Practices

### Prompt Engineering

1. **Be Specific**: Clearly define expected output format
2. **Provide Context**: Include ticket details and historical data
3. **Use Examples**: Show expected JSON structure
4. **Handle Edge Cases**: Account for missing or invalid data
5. **Iterate**: Refine prompts based on results

### Performance Optimization

1. **Batch Processing**: Process multiple tickets in parallel when possible
2. **Caching**: Cache agent workload data for short periods
3. **Timeout Handling**: Set appropriate timeouts for Rovo Agent calls
4. **Fallback Strategy**: Always have a fallback mechanism

### Security Considerations

1. **Input Validation**: Always validate input data
2. **Sanitize Logs**: Remove sensitive information from logs
3. **Access Control**: Use appropriate Jira permissions
4. **Rate Limiting**: Implement rate limiting for API calls

## Related Documentation

- [Automation Rules Setup](./automation-rules.md)
- [Automation Rule Templates](./automation-rule-templates/)
- [AI Triage Logic](./ai-triage-logic.md)
- [Forge Documentation](https://developer.atlassian.com/platform/forge/)
- [Rovo Agent Documentation](https://developer.atlassian.com/platform/rovo/)
