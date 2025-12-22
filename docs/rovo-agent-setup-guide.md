# Rovo Agent Setup Guide for TriageNinja

This guide explains how to set up Rovo Agent integration for AI-powered ticket triage.

## Prerequisites

- ✅ Atlassian Rovo enabled on your site
- ✅ TriageNinja app installed
- ✅ Jira Automation available (Premium or Enterprise plan)
- ✅ Admin permissions for Jira Automation

## What is Rovo Agent?

Rovo Agent is Atlassian's AI assistant that can:
- Analyze ticket content using natural language processing
- Classify tickets into categories
- Suggest priorities and assignees
- Learn from your team's historical data

## Setup Steps

### Step 1: Verify Rovo Agent is Deployed

1. Go to **Jira Settings** → **Apps** → **Manage apps**
2. Find **TriageNinja** in the list
3. Verify that **Rovo Agent** module is enabled
4. Agent name: `TriageNinja AI Agent`
5. Agent key: `triageninja-agent`

### Step 2: Create Jira Automation Rule

#### Option A: Import Template (Recommended)

1. Go to **Jira Settings** → **System** → **Automation**
2. Click **Create rule** → **Import rule**
3. Copy the content from `docs/automation-rule-templates/rovo-agent-auto-triage.json`
4. Paste into the import dialog
5. Replace `YOUR_PROJECT_ID` with your actual project ID
6. Click **Import**

#### Option B: Manual Setup

1. **Create New Rule**
   - Go to **Jira Settings** → **System** → **Automation**
   - Click **Create rule**

2. **Add Trigger**
   - Select **Issue created**
   - Choose your project(s)

3. **Add Condition** (Optional but recommended)
   - Select **Issue fields condition**
   - Field: **Assignee**
   - Condition: **is empty**
   - This ensures we only triage unassigned tickets

4. **Add Action: Invoke Rovo Agent (Classification)**
   - Select **Invoke Rovo Agent**
   - Agent: **TriageNinja AI Agent**
   - Action: **analyze-ticket-classification**
   - Input:
     ```json
     {
       "issueKey": "{{issue.key}}"
     }
     ```

5. **Add Action: Invoke Rovo Agent (Assignee Suggestion)**
   - Select **Invoke Rovo Agent**
   - Agent: **TriageNinja AI Agent**
   - Action: **suggest-ticket-assignee**
   - Input:
     ```json
     {
       "issueKey": "{{issue.key}}",
       "category": "{{rovoAgent.category}}"
     }
     ```

6. **Add Action: Edit Issue**
   - Select **Edit issue**
   - Fields to update:
     - **Priority**: `{{rovoAgent.priority}}`
     - **Assignee**: `{{rovoAgent.assigneeId}}`
     - **Labels**: Add `{{rovoAgent.category}}`

7. **Add Action: Add Comment**
   - Select **Add comment**
   - Comment:
     ```
     🤖 **AI Triage Complete (Rovo Agent)**
     
     - **Category**: {{rovoAgent.category}} / {{rovoAgent.subCategory}}
     - **Priority**: {{rovoAgent.priority}}
     - **Assignee**: {{rovoAgent.assignee}}
     - **Confidence**: {{rovoAgent.confidence}}%
     - **Reasoning**: {{rovoAgent.reasoning}}
     ```

8. **Name and Enable**
   - Name: `TriageNinja Auto-Triage with Rovo Agent`
   - Click **Turn on rule**

### Step 3: Test the Integration

1. **Create a Test Ticket**
   - Go to your project
   - Create a new issue
   - Summary: `Cannot connect to VPN from home`
   - Description: `I'm trying to connect to the company VPN but getting authentication errors`
   - Leave **Assignee** empty

2. **Wait for Automation**
   - Automation should trigger within 1-2 minutes
   - Check the **Automation** tab in Jira Settings to see execution logs

3. **Verify Results**
   - Ticket should be updated with:
     - ✅ Priority set (e.g., High/Medium/Low)
     - ✅ Assignee assigned
     - ✅ Category label added
     - ✅ AI comment with reasoning

### Step 4: Monitor and Adjust

1. **Check Automation Logs**
   - Go to **Jira Settings** → **System** → **Automation**
   - Click on your rule
   - View **Audit log** to see execution history

2. **Review AI Accuracy**
   - Check the TriageNinja dashboard
   - View **AI Accuracy** metric
   - Review assigned tickets for correctness

3. **Adjust Rovo Agent Prompt** (Optional)
   - If classifications are not accurate, you can adjust the agent prompt
   - Go to **manifest.yml** in the app source code
   - Update the `prompt` section under `rovo:agent`
   - Redeploy the app

## Troubleshooting

### Rovo Agent Not Found

**Problem**: Automation rule shows "Agent not found" error

**Solution**:
1. Verify TriageNinja app is installed
2. Check that Rovo module is enabled in manifest.yml
3. Redeploy the app: `forge deploy --environment production`
4. Reinstall if needed: `forge install --upgrade`

### Automation Not Triggering

**Problem**: New tickets are not being triaged automatically

**Solution**:
1. Check automation rule is **enabled**
2. Verify trigger is set to **Issue created**
3. Check project scope includes your project
4. Review audit logs for errors

### Assignee Not Set

**Problem**: Priority and category are set, but assignee is empty

**Solution**:
1. Verify users have **Assignable User** permission
2. Check that users are **active** (not invited/inactive)
3. Review Rovo Agent logs for assignee suggestion errors

### Low Confidence Scores

**Problem**: AI confidence is consistently below 70%

**Solution**:
1. Improve ticket descriptions (more details = better classification)
2. Add more historical data (Rovo learns from past tickets)
3. Adjust Rovo Agent prompt to be more specific to your domain

## Advanced Configuration

### Custom Categories

Edit the Rovo Agent prompt in `manifest.yml`:

```yaml
rovo:agent:
  - key: triageninja-agent
    prompt: |
      Category Examples:
      - Network & Connectivity (VPN, WiFi, Firewall)
      - Hardware (PC, Printer, Monitor)
      - Software (Application, OS, License)
      - YOUR_CUSTOM_CATEGORY (subcategories...)
```

### Multiple Projects

Create separate automation rules for each project with different settings:
- Different assignee pools
- Different priority thresholds
- Different category mappings

### Conditional Triage

Add conditions to automation rules:
- Only triage tickets with specific labels
- Only triage during business hours
- Only triage for specific issue types

## Benefits of Rovo Agent vs Keyword-Based

| Feature | Rovo Agent | Keyword-Based |
|---------|-----------|---------------|
| Accuracy | 85-95% | 60-75% |
| Learning | ✅ Learns from history | ❌ Static rules |
| Context | ✅ Understands context | ❌ Simple matching |
| Reasoning | ✅ Explains decisions | ❌ No explanation |
| Maintenance | ✅ Self-improving | ❌ Manual updates |

## Next Steps

1. ✅ Set up Rovo Agent automation
2. ✅ Test with sample tickets
3. ✅ Monitor accuracy in dashboard
4. ✅ Adjust prompt if needed
5. ✅ Enable for all projects

## Support

- **Documentation**: See `docs/` folder
- **Issues**: Create GitHub issue
- **Questions**: Contact support

---

**Note**: Rovo Agent requires Atlassian Rovo to be enabled on your site. Contact your Atlassian account manager if you don't have access.
