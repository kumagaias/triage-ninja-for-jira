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
   - **Agent:** Select `TriageNinja Rovo Agent`
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
3. Configure fields to update using the smart values returned by your Rovo Agent:
   - **Assignee:** set to the assignee account ID from the Rovo Agent output (for example: `{{rovoOutput.assignee.accountId}}`)
   - **Priority:** map from the priority value in the Rovo Agent output (for example: `{{rovoOutput.priority}}`)
     - High → Highest or High
     - Medium → Medium
     - Low → Low or Lowest
   - **Labels:** Add labels:
     - `ai-triaged`
     - `ai-category:{{rovoOutput.category}}`
     - `ai-confidence:{{rovoOutput.confidence}}`

   > **Note:** The exact smart value paths (e.g. `{{rovoOutput.assignee.accountId}}`) depend on how Rovo Agent is integrated with your Jira site. After running the rule once, open the rule's **Audit log**, expand the **Invoke Rovo Agent** action, and use **Inspect smart values** (or view the response payload) to copy the correct variable paths for your instance.

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

> **Note:** The following examples show conceptual configuration using pseudo-code. Jira Automation rules are configured through the UI, not YAML files. Use these as a guide for what to configure in the UI.

### Custom Field Mapping

If you use custom fields for category/priority, configure in the **Edit issue** action:

```
# Example configuration (configure in UI)
customfield_10001: "{{rovoOutput.category}}"
customfield_10002: "{{rovoOutput.subCategory}}"
```

### Conditional Updates

Only update priority if confidence is high by adding a condition before the **Edit issue** action:

```
# Example condition (configure in UI)
Condition: {{rovoOutput.confidence}} > 80
```

### Notification

Send notification when AI triages a ticket by adding a **Send email** action:

```
# Example email configuration (configure in UI)
To: {{issue.assignee.emailAddress}}
Subject: "New ticket assigned: {{issue.key}}"
Body: |
  You've been assigned a new ticket by TriageNinja AI.
  
  Ticket: {{issue.key}} - {{issue.summary}}
  Category: {{rovoOutput.category}}
  Confidence: {{rovoOutput.confidence}}%
  
  View ticket: {{issue.url}}
```

## Rule 2: Manual Triage (On-Demand)

This rule allows users to manually trigger AI triage for existing tickets by adding a label.

### Configuration

**Name:** `TriageNinja - Manual Triage on Label`

**Trigger:** Issue Updated

**Conditions:**
- Label `run-ai-triage` is added

**Actions:**
1. Invoke Rovo Agent
2. Update issue fields based on Rovo Agent response
3. Remove `run-ai-triage` label

### Step-by-Step Setup

#### Step 1: Create New Automation Rule

1. Navigate to **Project Settings** → **Automation**
2. Click **Create rule** button
3. Select **Issue updated** as the trigger

#### Step 2: Configure Trigger

1. **Trigger:** Issue updated
2. Click **Save**

#### Step 3: Add Condition

1. Click **Add condition**
2. Select **Issue fields condition**
3. Configure:
   - **Field:** Labels
   - **Condition:** contains
   - **Value:** `run-ai-triage`
4. Click **Save**

#### Step 4: Add Rovo Agent Action

1. Click **Add action**
2. Select **Invoke Rovo Agent** (under AI/Automation section)
3. Configure:
   - **Agent:** Select `TriageNinja Rovo Agent`
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
3. Configure fields to update using the smart values returned by your Rovo Agent:
   - **Assignee:** set to the assignee account ID from the Rovo Agent output (for example: `{{rovoOutput.assignee.accountId}}`)
   - **Priority:** map from the priority value in the Rovo Agent output (for example: `{{rovoOutput.priority}}`)
     - High → Highest or High
     - Medium → Medium
     - Low → Low or Lowest
   - **Labels:** Add labels:
     - `ai-triaged`
     - `ai-category:{{rovoOutput.category}}`
     - `ai-confidence:{{rovoOutput.confidence}}`

   > **Note:** The exact smart value paths (e.g. `{{rovoOutput.assignee.accountId}}`) depend on how Rovo Agent is integrated with your Jira site. After running the rule once, open the rule's **Audit log**, expand the **Invoke Rovo Agent** action, and use **Inspect smart values** (or view the response payload) to copy the correct variable paths for your instance.

4. Click **Save**

#### Step 6: Add Remove Label Action

1. Click **Add action**
2. Select **Edit issue**
3. Configure:
   - **Labels:** Remove label `run-ai-triage`
4. Click **Save**

> **Important:** Removing the label signals completion to the frontend, which polls for this change.

#### Step 7: Name and Activate Rule

1. Click **Turn on rule** at the top
2. Enter rule name: `TriageNinja - Manual Triage on Label`
3. Click **Turn it on**

### Testing

1. Open an existing ticket in Jira
2. Manually add the label `run-ai-triage` to the ticket
3. Wait 5-10 seconds for automation to run
4. Verify the ticket was updated:
   - ✅ Assignee is set (if previously empty or changed)
   - ✅ Priority is updated
   - ✅ Labels include `ai-triaged`, `ai-category:*`, `ai-confidence:*`
   - ✅ Label `run-ai-triage` is removed
5. Check Automation audit log:
   - Go to **Project Settings** → **Automation**
   - Click **Audit log**
   - Find your rule execution
   - Verify it completed successfully

### Frontend Integration

The TriageNinja issue panel includes a **"Run AI Triage"** button that:

1. Adds the `run-ai-triage` label to the ticket
2. Shows a loading state
3. Polls every 2 seconds to check if the label is removed
4. Refreshes the ticket data when complete
5. Times out after 30 seconds if not completed

This provides a seamless user experience for on-demand triage.

### Troubleshooting

#### Rule doesn't trigger

**Possible causes:**
- Label was not added correctly
- Rule is not activated
- Condition doesn't match

**Solution:**
- Verify label name is exactly `run-ai-triage` (case-sensitive)
- Check rule is turned on
- Review rule conditions in automation settings

#### Label not removed

**Possible causes:**
- Remove label action not configured
- Insufficient permissions
- Action failed before reaching remove step

**Solution:**
- Verify Step 6 is configured correctly
- Check automation has permission to edit issues
- Review audit log for errors in previous actions

#### Frontend polling times out

**Possible causes:**
- Automation takes longer than 30 seconds
- Automation failed silently
- Label removal action failed

**Solution:**
- Check automation audit log for execution time
- Verify all actions completed successfully
- Increase polling timeout if needed (requires code change)

### Use Cases

Manual triage is useful for:

- **Re-triaging tickets** - When initial assignment was incorrect
- **Existing tickets** - Triage tickets created before automation was enabled
- **Selective triage** - Only triage specific tickets on demand
- **Testing** - Verify AI recommendations before enabling automatic triage
- **Override scenarios** - When automatic triage was skipped due to conditions

## Next Steps

After setting up automatic triage:

1. ✅ Test with sample tickets
2. ✅ Monitor for 1-2 weeks
3. ✅ Set up **Manual Triage** rule (see [Rule 2](#rule-2-manual-triage-on-demand))
4. ✅ Train team on new workflow
5. ✅ Gather feedback and iterate

## Related Documentation

- [Manual Triage Automation Rule](#rule-2-manual-triage-on-demand)
- [Rovo Agent Integration Guide](./rovo-integration.md)

## Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Forge logs: `forge logs --tail`
3. Check Jira Automation audit log
4. Contact your Jira administrator or internal support team
5. Report issues: [GitHub Issues](https://github.com/kumagaias/triage-ninja-for-jira/issues)
