# TriageNinja Automation Rule Setup Guide

## Overview

TriageNinja provides an **Automation Action** that automatically triages tickets when they are created. This guide shows you how to set up the automation rule.

## Benefits

✅ **Zero-click triage** - Tickets are automatically classified and assigned  
✅ **No manual intervention** - Works in the background  
✅ **AI-powered** - Uses Rovo Agent for intelligent classification  
✅ **Workload-aware** - Assigns to team members based on current workload

## Prerequisites

- TriageNinja app installed in your Jira site
- Jira Automation access (Admin or Automation Admin role)
- Rovo Agent enabled (included with Jira Premium/Enterprise)

## Setup Steps

### Step 1: Open Jira Automation

1. Go to your Jira project
2. Click **Project settings** (bottom left)
3. Click **Automation** in the left sidebar
4. Click **Create rule** button

### Step 2: Configure the Trigger

1. Select **Issue created** as the trigger
2. (Optional) Add conditions to filter which tickets should be triaged:
   - Example: Only triage tickets with no assignee
   - Example: Only triage specific issue types (Bug, Task, etc.)

### Step 3: Add TriageNinja Action

1. Click **Add component** → **Action**
2. Search for **"TriageNinja Auto Triage"**
3. Select the action
4. Configure the input:
   - **Issue Key**: Enter `{{issue.key}}` (this passes the current ticket)
5. Click **Save**

### Step 4: Update the Ticket (Optional)

The TriageNinja action returns the following outputs:
- `{{autoTriageAction.category}}` - Classified category
- `{{autoTriageAction.priority}}` - Suggested priority
- `{{autoTriageAction.assignee}}` - Suggested assignee ID
- `{{autoTriageAction.confidence}}` - AI confidence score (0-100)

You can use these outputs to update the ticket:

1. Click **Add component** → **Action**
2. Select **Edit issue**
3. Configure fields:
   - **Priority**: `{{autoTriageAction.priority}}`
   - **Assignee**: `{{autoTriageAction.assignee}}`
   - **Labels**: Add `{{autoTriageAction.category}}`
4. Click **Save**

### Step 5: Add Comment (Optional)

Add a comment to show triage results:

1. Click **Add component** → **Action**
2. Select **Add comment**
3. Enter comment text:
   ```
   🤖 **AI Triage Complete**
   
   - **Category**: {{autoTriageAction.category}}
   - **Priority**: {{autoTriageAction.priority}}
   - **Confidence**: {{autoTriageAction.confidence}}%
   - **Assigned to**: {{autoTriageAction.assignee.displayName}}
   ```
4. Click **Save**

### Step 6: Name and Enable the Rule

1. Click **Turn it on** (top right)
2. Enter a name: "TriageNinja Auto-Triage"
3. Click **Turn it on**

## Complete Rule Example

Here's a complete automation rule configuration:

```
WHEN: Issue created
IF: Assignee is empty
THEN: 
  1. TriageNinja Auto Triage
     - Issue Key: {{issue.key}}
  2. Edit issue
     - Priority: {{autoTriageAction.priority}}
     - Assignee: {{autoTriageAction.assignee}}
     - Labels: Add {{autoTriageAction.category}}
  3. Add comment
     - "🤖 AI Triage: {{autoTriageAction.category}} ({{autoTriageAction.confidence}}% confidence)"
```

## Testing

1. Create a new ticket in your project
2. Wait a few seconds
3. Check that the ticket was:
   - Assigned to a team member
   - Priority was set
   - Category label was added
   - Comment was added (if configured)

## Troubleshooting

### Action not appearing in Automation

- Ensure TriageNinja app is installed
- Refresh the Automation page
- Check app permissions in Jira settings

### Triage not working

1. Check Automation audit log:
   - Go to **Project settings** → **Automation**
   - Click **Audit log**
   - Find your rule execution
   - Check for errors

2. Check TriageNinja logs:
   ```bash
   forge logs --environment production --tail
   ```

3. Common issues:
   - No assignable users in project
   - Rovo Agent not enabled
   - Insufficient permissions

### Low confidence scores

If AI confidence is consistently low:
- Ensure ticket summaries are descriptive
- Add more details in ticket descriptions
- Check that Rovo Agent is properly configured

## Advanced Configuration

### Conditional Triage

Only triage high-priority tickets:

```
WHEN: Issue created
IF: Priority is High OR Priority is Highest
THEN: TriageNinja Auto Triage
```

### Multi-project Setup

Create a global automation rule:

1. Go to **Jira Settings** → **System** → **Automation**
2. Create a **Global rule**
3. Use the same configuration as above
4. Rule will apply to all projects

### Custom Fields

Update custom fields with triage results:

```
THEN: Edit issue
  - Custom Field "AI Category": {{autoTriageAction.category}}
  - Custom Field "AI Confidence": {{autoTriageAction.confidence}}
```

## Best Practices

1. **Start with one project** - Test the rule before rolling out globally
2. **Monitor confidence scores** - Review low-confidence triages manually
3. **Adjust conditions** - Fine-tune which tickets get auto-triaged
4. **Review regularly** - Check audit logs to ensure accuracy
5. **Provide feedback** - Report issues to improve AI accuracy

## Support

For issues or questions:
- Check the [TriageNinja documentation](../README.md)
- View [Forge logs](https://developer.atlassian.com/platform/forge/cli-reference/logs/)
- Contact your Jira administrator

## Next Steps

- [Configure Auto-Triage Settings](./auto-triage-settings.md)
- [View Dashboard Analytics](./dashboard-guide.md)
- [Customize Categories](./category-customization.md)
