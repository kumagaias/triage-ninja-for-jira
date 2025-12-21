# Jira Automation Rules for TriageNinja

This document provides step-by-step instructions for setting up Jira Automation rules to enable AI-powered ticket triage using Rovo Agent.

## Overview

TriageNinja uses **Jira Automation + Rovo Agent** to automatically analyze and triage tickets. There are two automation rules:

1. **Automatic Triage** - Triggers when a new ticket is created
2. **Manual Triage** - Triggers when a user adds a specific label

Both rules invoke the TriageNinja Rovo Agent, which uses three custom actions to analyze tickets and suggest assignees.

## Prerequisites

Before setting up automation rules, ensure:

- ✅ TriageNinja app is installed and deployed to your Jira site
- ✅ You have Jira Administrator permissions
- ✅ Rovo Agent is enabled for your Atlassian organization
- ✅ The following Rovo Actions are available:
  - `analyze-ticket-classification`
  - `suggest-ticket-assignee`
  - `find-similar-tickets`

## Rule 1: Automatic Triage (On Ticket Creation)

This rule automatically triages new tickets when they are created.

### Configuration

**Name:** `TriageNinja - Auto-Triage New Tickets`

**Trigger:** Issue Created

**Conditions:**
- Issue type is one of: `Support Request`, `Bug`, `Task`
- Assignee is `EMPTY`

**Actions:**
1. Invoke Rovo Agent
2. Update issue fields based on Rovo Agent response

### Step-by-Step Setup

#### Step 1: Create New Automation Rule

1. Navigate to **Project Settings** → **Automation**
2. Click **Create rule** button
3. Select **Issue created** as the trigger

#### Step 2: Configure Trigger

1. **Trigger:** Issue created
2. Click **Save**

#### Step 3: Add Conditions

1. Click **Add condition**
2. Select **Issue fields condition**
3. Configure:
   - **Field:** Issue type
   - **Condition:** is one of
   - **Value:** Select `Support Request`, `Bug`, `Task` (or your desired issue types)
4. Click **Save**

5. Click **Add condition** again
6. Select **Issue fields condition**
7. Configure:
   - **Field:** Assignee
   - **Condition:** is empty
8. Click **Save**

#### Step 4: Add Rovo Agent Action

1. Click **Add action**
2. Select **Invoke Rovo Agent** (under AI/Automation section)
3. Configure:
   - **Agent:** Select `TriageNinja AI Agent`
   - **Prompt:**
     ```
     Analyze this ticket and provide triage recommendations.
     
     Use the following actions to gather information:
     1. analyze-ticket-classification - Get ticket details and context
     2. suggest-ticket-assignee - Get available agents and workload
     3. find-similar-tickets - Find similar resolved tickets
     
     Based on the analysis, provide:
     - Category and subcategory
     - Priority (High/Medium/Low)
     - Urgency (Urgent/Normal)
     - Suggested assignee with reasoning
     - Confidence score (0-100)
     
     Return results in JSON format:
     {
       "category": "string",
       "subCategory": "string",
       "priority": "High|Medium|Low",
       "urgency": "Urgent|Normal",
       "assignee": {
         "accountId": "string",
         "displayName": "string",
         "reasoning": "string"
       },
       "confidence": number,
       "tags": ["string"]
     }
     ```
4. Click **Save**

#### Step 5: Add Update Issue Action

1. Click **Add action**
2. Select **Edit issue**
3. Configure fields to update:
   - **Assignee:** `{{rovoAgent.assignee.accountId}}`
   - **Priority:** Map from `{{rovoAgent.priority}}`
     - High → Highest or High
     - Medium → Medium
     - Low → Low or Lowest
   - **Labels:** Add labels:
     - `ai-triaged`
     - `ai-category:{{rovoAgent.category}}`
     - `ai-confidence:{{rovoAgent.confidence}}`
4. Click **Save**

#### Step 6: Name and Activate Rule

1. Click **Turn on rule** at the top
2. Enter rule name: `TriageNinja - Auto-Triage New Tickets`
3. Click **Turn it on**

### Testing

1. Create a new test ticket:
   - **Project:** Your project
   - **Issue Type:** Support Request (or configured type)
   - **Summary:** "Cannot connect to VPN from home"
   - **Description:** "I'm unable to connect to the company VPN. Getting authentication error."
   - **Assignee:** Leave empty

2. Wait 5-10 seconds for automation to run

3. Verify the ticket was updated:
   - ✅ Assignee is set
   - ✅ Priority is updated
   - ✅ Labels include `ai-triaged`, `ai-category:*`, `ai-confidence:*`

4. Check Automation audit log:
   - Go to **Project Settings** → **Automation**
   - Click **Audit log**
   - Find your rule execution
   - Verify it completed successfully

### Troubleshooting

#### Rule doesn't trigger

**Possible causes:**
- Issue type doesn't match conditions
- Assignee is not empty
- Rule is not activated

**Solution:**
- Check rule conditions match your test ticket
- Ensure assignee field is empty when creating ticket
- Verify rule is turned on

#### Rovo Agent action fails

**Possible causes:**
- Rovo Agent not available
- Actions not deployed
- Invalid prompt format

**Solution:**
- Verify TriageNinja app is deployed: `forge deploy`
- Check Rovo Actions are available in manifest.yml
- Review Forge logs: `forge logs --tail`

#### Fields not updated

**Possible causes:**
- Invalid field mapping
- Rovo Agent response format mismatch
- Insufficient permissions

**Solution:**
- Check Rovo Agent response format matches expected JSON
- Verify field IDs are correct
- Ensure automation has permission to edit issues

## Expected Behavior

When a new ticket is created:

1. **Trigger fires** (within 1-2 seconds)
2. **Conditions checked** (issue type, assignee empty)
3. **Rovo Agent invoked** (3-5 seconds)
   - Calls `analyze-ticket-classification` action
   - Calls `suggest-ticket-assignee` action
   - Calls `find-similar-tickets` action
   - AI analyzes all data and returns recommendations
4. **Issue updated** (1-2 seconds)
   - Assignee set to suggested user
   - Priority updated
   - Labels added
5. **Total time:** 5-10 seconds

## Monitoring

### Automation Audit Log

1. Go to **Project Settings** → **Automation**
2. Click **Audit log**
3. Filter by rule name: `TriageNinja - Auto-Triage New Tickets`
4. Review execution history:
   - ✅ Success: Green checkmark
   - ❌ Failed: Red X with error message
   - ⏸️ Skipped: Conditions not met

### Forge Logs

```bash
# View real-time logs
forge logs --tail --environment production

# Filter by action
forge logs --tail | grep "analyzeTicketClassification"
```

### Key Metrics to Track

- **Success Rate:** % of successful rule executions
- **Average Execution Time:** Time from trigger to completion
- **Confidence Scores:** Average AI confidence
- **Fallback Rate:** How often fallback logic is used

## Best Practices

### 1. Start with Limited Scope

Begin with a single project or issue type:
- Test thoroughly before expanding
- Monitor for false positives
- Gather user feedback

### 2. Customize Conditions

Adjust conditions based on your workflow:
- Add project-specific conditions
- Filter by reporter or labels
- Exclude certain issue types

### 3. Monitor and Iterate

Regularly review automation performance:
- Check audit logs weekly
- Analyze confidence scores
- Adjust prompt if needed

### 4. Provide Feedback Loop

Allow users to correct AI decisions:
- Add "AI Incorrect" label for tracking
- Review incorrect classifications
- Update prompt based on patterns

## Advanced Configuration

### Custom Field Mapping

If you use custom fields for category/priority:

```yaml
# In Edit Issue action
customfield_10001: "{{rovoAgent.category}}"
customfield_10002: "{{rovoAgent.subCategory}}"
```

### Conditional Updates

Only update priority if confidence is high:

```yaml
# Add condition before Edit Issue action
Condition: {{rovoAgent.confidence}} > 80
```

### Notification

Send notification when AI triages a ticket:

```yaml
# Add Send email action
To: {{issue.assignee.emailAddress}}
Subject: "New ticket assigned: {{issue.key}}"
Body: |
  You've been assigned a new ticket by TriageNinja AI.
  
  Ticket: {{issue.key}} - {{issue.summary}}
  Category: {{rovoAgent.category}}
  Confidence: {{rovoAgent.confidence}}%
  
  View ticket: {{issue.url}}
```

## Next Steps

After setting up automatic triage:

1. ✅ Test with sample tickets
2. ✅ Monitor for 1-2 weeks
3. ✅ Set up **Manual Triage** rule (see next section)
4. ✅ Train team on new workflow
5. ✅ Gather feedback and iterate

## Related Documentation

- [Manual Triage Automation Rule](./automation-rules.md#rule-2-manual-triage)
- [Rovo Agent Integration Guide](./rovo-agent-integration.md)
- [Prompt Engineering Guide](./prompt-engineering.md)
- [Troubleshooting Guide](./troubleshooting.md)

## Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Forge logs: `forge logs --tail`
3. Check Jira Automation audit log
4. Contact support: support@triageninja.com
5. Report issues: [GitHub Issues](https://github.com/kumagaias/triage-ninja-for-jira/issues)
