# Test Execution Guide for TriageNinja

## Overview

This guide provides step-by-step instructions for executing tests for Tasks 6.1-6.6 (Testing and Validation).

## Prerequisites

- TriageNinja deployed to development environment
- Access to Jira development site
- Test tickets created
- Jira Automation rules configured

## Task 6.1: Test analyze-ticket-classification Action

### Objective

Verify that the `analyze-ticket-classification` action correctly analyzes tickets and returns structured data.

### Test Cases

#### Test Case 1.1: Network Issue

**Setup**:
```
Summary: "Cannot connect to VPN from home"
Description: "Getting authentication failed error when trying to connect to company VPN"
Type: Support Request
```

**Expected Result**:
```json
{
  "issueKey": "SUP-XXX",
  "summary": "Cannot connect to VPN from home",
  "category": "Network & Connectivity",
  "subCategory": "VPN",
  "priority": "Medium",
  "confidence": 75
}
```

**Verification**:
- [ ] Action returns valid JSON
- [ ] Category is "Network & Connectivity"
- [ ] SubCategory is "VPN"
- [ ] Confidence score is between 70-80

#### Test Case 1.2: Hardware Issue

**Setup**:
```
Summary: "Printer not working"
Description: "Office printer shows error message and won't print"
Type: Support Request
```

**Expected Result**:
```json
{
  "category": "Hardware",
  "subCategory": "Printer",
  "priority": "Medium"
}
```

**Verification**:
- [ ] Category is "Hardware"
- [ ] SubCategory is "Printer"
- [ ] Priority is appropriate

#### Test Case 1.3: Invalid Issue Key

**Setup**:
```
issueKey: "INVALID-123"
```

**Expected Result**:
- Error message returned
- No crash or exception
- Appropriate error logging

**Verification**:
- [ ] Error is handled gracefully
- [ ] Error message is descriptive
- [ ] System remains functional

### Execution Steps

1. **Manual Invocation via Forge CLI**:
   ```bash
   forge invoke --function analyze-classification \
     --payload '{"issueKey":"SUP-123"}'
   ```

2. **Via Jira Automation**:
   - Create test automation rule
   - Add action: "Invoke Rovo Agent"
   - Select "Analyze Ticket Classification"
   - Provide test issue key
   - Run rule manually
   - Check audit log for results

3. **Via UI**:
   - Open test ticket
   - Click "Run AI Triage" button
   - Verify results displayed
   - Check browser console for errors

### Success Criteria

- [ ] All test cases pass
- [ ] Response time < 3 seconds
- [ ] No errors in Forge logs
- [ ] JSON structure matches expected format
- [ ] Confidence scores are reasonable (> 50)

## Task 6.2: Test suggest-ticket-assignee Action

### Objective

Verify that the `suggest-ticket-assignee` action correctly suggests assignees based on workload and skills.

### Test Cases

#### Test Case 2.1: Network Category

**Setup**:
```
issueKey: "SUP-123"
category: "Network & Connectivity"
Available agents: 3 team members
```

**Expected Result**:
```json
{
  "assignee": "Agent with lowest workload",
  "reason": "Selected based on lowest current workload",
  "confidence": 60
}
```

**Verification**:
- [ ] Assignee is selected
- [ ] Reason is provided
- [ ] Workload is considered

#### Test Case 2.2: No Available Agents

**Setup**:
```
issueKey: "SUP-123"
category: "Network"
Available agents: 0
```

**Expected Result**:
```json
{
  "assignee": "Unassigned",
  "reason": "No available agents found",
  "confidence": 0
}
```

**Verification**:
- [ ] Returns "Unassigned"
- [ ] Appropriate reason provided
- [ ] No crash or error

### Success Criteria

- [ ] All test cases pass
- [ ] Workload calculation is accurate
- [ ] Assignee recommendation is logical
- [ ] Error scenarios handled gracefully

## Task 6.3: Test find-similar-tickets Action

### Objective

Verify that the `find-similar-tickets` action finds relevant similar tickets.

### Test Cases

#### Test Case 3.1: Similar Tickets Exist

**Setup**:
```
Current ticket: "VPN connection problem"
Past tickets: 5 resolved VPN issues
```

**Expected Result**:
```json
{
  "similarTickets": [
    {
      "id": "SUP-100",
      "similarity": 85,
      "solution": "Reset VPN credentials"
    }
  ],
  "totalFound": 3
}
```

**Verification**:
- [ ] Returns top 3 similar tickets
- [ ] Similarity scores are reasonable
- [ ] Solutions are provided

#### Test Case 3.2: No Similar Tickets

**Setup**:
```
Current ticket: "Unique issue"
Past tickets: No matches
```

**Expected Result**:
```json
{
  "similarTickets": [],
  "suggestedActions": ["No similar tickets found"]
}
```

**Verification**:
- [ ] Returns empty array
- [ ] Appropriate message provided
- [ ] No errors

### Success Criteria

- [ ] All test cases pass
- [ ] Similarity scoring works correctly
- [ ] Top 3 results returned
- [ ] Error scenarios handled

## Task 6.4: Test Automatic Triage Automation Rule

### Objective

Verify that the automatic triage rule triggers on issue creation and updates ticket fields.

### Test Procedure

#### Step 1: Create Test Ticket

```
Summary: "Cannot access shared drive"
Description: "Getting permission denied error"
Type: Support Request
Assignee: (empty)
```

#### Step 2: Wait for Automation

- Wait 5-10 seconds
- Refresh ticket page

#### Step 3: Verify Results

**Expected Changes**:
- [ ] Assignee is set
- [ ] Priority is updated
- [ ] Labels added:
  - [ ] `ai-triaged`
  - [ ] `ai-category:*`
  - [ ] `ai-subcategory:*`
  - [ ] `ai-confidence:*`

#### Step 4: Check Logs

```bash
forge logs --environment development | grep "analyzeTicketClassification"
```

**Expected Logs**:
- [ ] Action invoked
- [ ] Success logged
- [ ] No errors

### Success Criteria

- [ ] Automation triggers automatically
- [ ] Rovo Agent is invoked
- [ ] All three actions execute
- [ ] Ticket fields updated correctly
- [ ] No errors in audit log

## Task 6.5: Test Manual Triage Automation Rule

### Objective

Verify that the manual triage rule triggers on label addition and removes label after completion.

### Test Procedure

#### Step 1: Open Existing Ticket

- Navigate to any ticket
- Note current assignee and labels

#### Step 2: Trigger Manual Triage

- Click "Run AI Triage" button
- Observe loading state

#### Step 3: Wait for Completion

- Wait up to 30 seconds
- Observe progress bar

#### Step 4: Verify Results

**Expected Changes**:
- [ ] Results displayed in UI
- [ ] Category shown
- [ ] Priority shown
- [ ] Suggested assignee shown
- [ ] Similar tickets listed
- [ ] Label `run-ai-triage` removed

#### Step 5: Check Automation Audit Log

Navigate to: Jira Settings → System → Automation → Audit log

**Expected Entries**:
- [ ] Rule triggered
- [ ] Rovo Agent invoked
- [ ] Issue updated
- [ ] Label removed

### Success Criteria

- [ ] Button click triggers automation
- [ ] Label added and removed correctly
- [ ] Results displayed within 30 seconds
- [ ] Ticket updated correctly
- [ ] No errors in logs

## Task 6.6: Test Fallback Scenarios

### Objective

Verify that the system falls back to keyword-based logic when Rovo Agent is unavailable.

### Test Procedure

#### Step 1: Simulate Rovo Agent Unavailability

**Option A**: Temporarily disable automation rule
**Option B**: Use invalid action configuration
**Option C**: Test with network timeout

#### Step 2: Trigger Manual Triage

- Click "Run AI Triage" button
- Wait for timeout (30 seconds)

#### Step 3: Verify Fallback

**Expected Behavior**:
- [ ] Fallback logic activates
- [ ] Keyword-based classification used
- [ ] Results still displayed
- [ ] Error logged but not shown to user
- [ ] System remains functional

#### Step 4: Check Metrics

```bash
forge logs --environment development | grep "Metrics"
```

**Expected Metrics**:
- [ ] Fallback usage tracked
- [ ] Reason recorded (e.g., "timeout", "error")
- [ ] Fallback rate calculated

### Success Criteria

- [ ] Fallback activates automatically
- [ ] Keyword-based logic works
- [ ] User experience not severely impacted
- [ ] Error messages are appropriate
- [ ] Metrics track fallback usage

## Overall Testing Checklist

### Pre-Testing

- [ ] All unit tests passing (73 tests)
- [ ] Security checks passing
- [ ] Deployed to development
- [ ] Test tickets created
- [ ] Automation rules configured

### During Testing

- [ ] Document all test results
- [ ] Take screenshots of issues
- [ ] Record error messages
- [ ] Note response times
- [ ] Check logs regularly

### Post-Testing

- [ ] All test cases passed
- [ ] No critical errors found
- [ ] Performance acceptable
- [ ] User experience smooth
- [ ] Ready for production deployment

## Test Results Template

### Test Execution Summary

**Date**: YYYY-MM-DD  
**Tester**: [Name]  
**Environment**: Development  
**Version**: 1.2.23

#### Task 6.1: analyze-ticket-classification
- [ ] Test Case 1.1: Network Issue - ✅ PASS / ❌ FAIL
- [ ] Test Case 1.2: Hardware Issue - ✅ PASS / ❌ FAIL
- [ ] Test Case 1.3: Invalid Issue Key - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

#### Task 6.2: suggest-ticket-assignee
- [ ] Test Case 2.1: Network Category - ✅ PASS / ❌ FAIL
- [ ] Test Case 2.2: No Available Agents - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

#### Task 6.3: find-similar-tickets
- [ ] Test Case 3.1: Similar Tickets Exist - ✅ PASS / ❌ FAIL
- [ ] Test Case 3.2: No Similar Tickets - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

#### Task 6.4: Automatic Triage
- [ ] Automation triggers - ✅ PASS / ❌ FAIL
- [ ] Fields updated - ✅ PASS / ❌ FAIL
- [ ] Labels added - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

#### Task 6.5: Manual Triage
- [ ] Button triggers automation - ✅ PASS / ❌ FAIL
- [ ] Label removed - ✅ PASS / ❌ FAIL
- [ ] Results displayed - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

#### Task 6.6: Fallback Scenarios
- [ ] Fallback activates - ✅ PASS / ❌ FAIL
- [ ] Keyword logic works - ✅ PASS / ❌ FAIL
- [ ] Metrics tracked - ✅ PASS / ❌ FAIL

**Notes**: [Any observations or issues]

### Overall Result

- [ ] ✅ All tests passed - Ready for production
- [ ] ⚠️ Minor issues found - Fix before production
- [ ] ❌ Critical issues found - Do not deploy

**Recommendation**: [Deploy / Fix issues / Further testing needed]

## Troubleshooting

### Issue: Action Not Found

**Symptom**: "Action not found" error in automation

**Solution**:
1. Verify deployment successful
2. Check manifest.yml has action defined
3. Wait 5-10 minutes for propagation
4. Redeploy if necessary

### Issue: Timeout

**Symptom**: Triage takes > 30 seconds

**Solution**:
1. Check Forge logs for errors
2. Verify Jira API is responsive
3. Check network connectivity
4. Increase timeout if needed

### Issue: Incorrect Results

**Symptom**: Classification is wrong

**Solution**:
1. Review ticket content
2. Check keyword matching logic
3. Verify confidence scores
4. Consider improving prompts

## Related Documentation

- [Testing Guide](./testing-guide.md)
- [Rovo Integration Guide](./rovo-integration.md)
- [Deployment Guide](./deployment-guide.md)
- [Automation Rules](./automation-rules.md)
