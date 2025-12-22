# TriageNinja Automation Quick Start Guide

## 🚀 3-Step Setup

### Step 1: Open Automation Settings

Click the **"⚙️ Setup Automation"** button in the TriageNinja dashboard, or go to:
```
Jira Settings → System → Automation
```

### Step 2: Create New Rule

1. Click **"Create rule"**
2. Select **"Issue created"** as trigger
3. Click **"Save"**

### Step 3: Add TriageNinja Action

1. Click **"Add component"** → **"Action"**
2. Search for **"TriageNinja Auto Triage"**
3. In the **Issue Key** field, enter: `{{issue.key}}`
4. Click **"Save"**

### Step 4: Update Ticket (Recommended)

1. Click **"Add component"** → **"Action"**
2. Select **"Edit issue"**
3. Configure fields:
   - **Priority**: `{{autoTriageAction.priority}}`
   - **Assignee**: `{{autoTriageAction.assignee}}`
   - **Labels**: Add `{{autoTriageAction.category}}`
4. Click **"Save"**

### Step 5: Enable Rule

1. Click **"Turn it on"** (top right)
2. Name your rule: "TriageNinja Auto-Triage"
3. Click **"Turn it on"**

---

## ✅ Done!

New tickets will now be automatically triaged!

### Test It

1. Create a new ticket in your project
2. Wait 3-5 seconds
3. Check that the ticket was:
   - ✅ Assigned to a team member
   - ✅ Priority was set
   - ✅ Category label was added

---

## 📋 Complete Rule Example

```
WHEN: Issue created
THEN:
  1. TriageNinja Auto Triage
     Input: {{issue.key}}
  
  2. Edit issue
     - Priority: {{autoTriageAction.priority}}
     - Assignee: {{autoTriageAction.assignee}}
     - Labels: {{autoTriageAction.category}}
  
  3. Add comment (optional)
     "🤖 AI Triage: {{autoTriageAction.category}} 
      ({{autoTriageAction.confidence}}% confidence)"
```

---

## 🎯 Advanced Options

### Only Triage Untriaged Tickets

Add a condition after the trigger:
```
IF: Assignee is empty
THEN: TriageNinja Auto Triage
```

### Only Triage Specific Issue Types

Add a condition:
```
IF: Issue type = Bug OR Issue type = Task
THEN: TriageNinja Auto Triage
```

### Add AI Comment

After the Edit issue action:
```
Add comment:
🤖 **AI Triage Complete**

- **Category**: {{autoTriageAction.category}}
- **Priority**: {{autoTriageAction.priority}}
- **Confidence**: {{autoTriageAction.confidence}}%
```

---

## 🔧 Troubleshooting

### Action Not Appearing

1. Refresh the Automation page
2. Check that TriageNinja app is installed
3. Verify you have admin permissions

### Triage Not Working

1. Check Automation audit log:
   - **Project settings** → **Automation** → **Audit log**
2. Look for errors in the rule execution
3. Check TriageNinja logs:
   ```bash
   forge logs --environment production --tail
   ```

### Low Confidence Scores

- Ensure ticket summaries are descriptive
- Add more details in descriptions
- Check that Rovo Agent is enabled

---

## 📚 Full Documentation

For detailed setup instructions, see:
- [Complete Setup Guide](./automation-rule-setup.md)
- [Troubleshooting Guide](./testing-guide.md)

---

## 💡 Tips

1. **Start with one project** - Test before rolling out globally
2. **Monitor confidence scores** - Review low-confidence triages
3. **Adjust conditions** - Fine-tune which tickets get triaged
4. **Review regularly** - Check audit logs for accuracy

---

## 🆘 Need Help?

- Check the [FAQ](../README.md#faq)
- View [Forge logs](https://developer.atlassian.com/platform/forge/cli-reference/logs/)
- Contact your Jira administrator
