# Deployment Guide for TriageNinja

## Overview

This guide covers the deployment process for TriageNinja to Atlassian Forge environments.

## Prerequisites

- Forge CLI installed and authenticated (`forge login`)
- Node.js 22.x (Forge runtime). You may use Node.js 24.x for local development, but your app runs on Node.js 22.x in Forge.
- Access to Jira site for installation
- All tests passing (`make test`)

## Deployment Environments

TriageNinja supports two deployment environments:

1. **Development**: For testing and development
2. **Production**: For live usage

## Deployment Process

### Step 1: Pre-Deployment Checks

Before deploying, ensure all checks pass:

```bash
# Run linter
forge lint

# Run all tests
make test

# Run security checks
make security-check
```

**Expected Output**:
- ✅ No lint issues
- ✅ All tests passing (73 tests)
- ✅ No security vulnerabilities

### Step 2: Deploy to Development

Deploy to the development environment first for testing:

```bash
forge deploy --non-interactive --environment development
```

**Expected Output**:
```
✔ Deployed
Deployed triage-ninja-for-jira to the development environment.
```

### Step 3: Upgrade Development Installation

If scopes or permissions changed, upgrade the installation:

```bash
forge install --upgrade --non-interactive \
  --site <your-dev-site>.atlassian.net \
  --product jira \
  --environment development
```

### Step 4: Test in Development

1. Navigate to your Jira development site
2. Open any issue
3. Verify "AI Triage" panel appears
4. Click "Run AI Triage" button
5. Verify results are displayed
6. Check Forge logs for errors:

```bash
forge logs --environment development --tail
```

### Step 5: Deploy to Production

Once development testing is complete, deploy to production:

```bash
forge deploy --non-interactive --environment production
```

**Expected Output**:
```
✔ Deployed
Deployed triage-ninja-for-jira to the production environment.
```

### Step 6: Upgrade Production Installation

Upgrade the production installation:

```bash
forge install --upgrade --non-interactive \
  --site <your-site>.atlassian.net \
  --product jira \
  --environment production
```

**Expected Output**:
```
✔ Upgrade complete!
Your app in the production environment is now the latest in Jira.
```

### Step 7: Verify Production Deployment

1. Navigate to your Jira production site
2. Test the AI Triage panel
3. Verify automation rules are working
4. Monitor logs for errors:

```bash
forge logs --environment production --tail
```

## Deployment Verification Checklist

### UI Components

- [ ] Dashboard appears in project sidebar
- [ ] "AI Triage" panel appears on issue detail page
- [ ] "Run AI Triage" button is clickable
- [ ] Results are displayed after triage
- [ ] Loading states work correctly
- [ ] Error messages are user-friendly

### Rovo Actions

- [ ] `analyze-ticket-classification` action is available
- [ ] `suggest-ticket-assignee` action is available
- [ ] `find-similar-tickets` action is available
- [ ] Actions can be invoked from Jira Automation
- [ ] Actions return expected JSON structure

### Automation Rules

- [ ] Automatic triage rule triggers on issue creation
- [ ] Manual triage rule triggers on label addition
- [ ] Ticket fields are updated correctly
- [ ] Labels are added/removed as expected
- [ ] No errors in Jira Automation audit log

### Logging and Metrics

- [ ] Action invocations are logged
- [ ] Errors are logged with context
- [ ] Metrics are tracked (success/failure rates)
- [ ] Hourly metrics logs appear
- [ ] No sensitive information in logs

## Monitoring

### View Logs

```bash
# Tail logs in real-time
forge logs --environment production --tail

# View last 100 lines
forge logs --environment production -n 100

# Filter by function
forge logs --environment production | grep "analyzeTicketClassification"

# Filter by error
forge logs --environment production | grep "ERROR"
```

### Key Metrics to Monitor

1. **Deployment Success**
   - Version number matches expected
   - No deployment errors
   - Installation upgrade successful

2. **Action Invocations**
   - Actions are being called
   - Response times are acceptable (< 3s)
   - Success rate > 90%

3. **Error Rates**
   - Error rate < 5%
   - No critical errors
   - Fallback logic activates when needed

4. **User Experience**
   - UI loads quickly (< 1s)
   - Results appear within 30s
   - No UI errors or crashes

## Rollback Procedure

If issues are detected after deployment:

### Option 1: Redeploy Previous Version

```bash
# Deploy previous version from git
git checkout <previous-tag>
forge deploy --non-interactive --environment production
forge install --upgrade --non-interactive \
  --site <your-site>.atlassian.net \
  --product jira \
  --environment production
```

### Option 2: Disable Problematic Features

1. Temporarily disable automation rules in Jira
2. Fix issues in development
3. Test thoroughly
4. Redeploy to production

## Troubleshooting

### Deployment Fails

**Symptom**: `forge deploy` command fails

**Solutions**:
1. Check `forge lint` output for errors
2. Verify Node.js version matches Forge runtime (22.x)
3. Check network connectivity
4. Verify Forge CLI is up to date: `npm install -g @forge/cli@latest`

### Installation Upgrade Fails

**Symptom**: `forge install --upgrade` fails

**Solutions**:
1. Verify site URL is correct
2. Check if you have admin permissions
3. Verify app is already installed
4. Check Forge status: `forge status`

### Actions Not Available

**Symptom**: Rovo Actions don't appear in Jira Automation

**Solutions**:
1. Verify deployment was successful
2. Check manifest.yml has correct action definitions
3. Verify Rovo Agent is enabled in your Atlassian instance
4. Wait 5-10 minutes for actions to propagate

### UI Not Loading

**Symptom**: Dashboard or issue panel doesn't appear

**Solutions**:
1. Clear browser cache
2. Check Forge logs for errors
3. Verify resources are built: `ls static/dashboard/build`
4. Rebuild frontend: `npm run build --prefix static/dashboard`

### Metrics Not Appearing

**Symptom**: No metrics logs in Forge logs

**Solutions**:
1. Verify metricsTracker is imported in rovoAgent.ts
2. Check if actions are being invoked
3. Wait 1 hour for first metrics log
4. Manually trigger: `metricsTracker.logMetrics()`

## Post-Deployment Tasks

### 1. Update Documentation

- [ ] Update README.md with new version number
- [ ] Update CHANGELOG.md with changes
- [ ] Update user documentation if needed

### 2. Notify Stakeholders

- [ ] Notify team of successful deployment
- [ ] Share release notes
- [ ] Announce new features

### 3. Monitor for 24 Hours

- [ ] Check logs every 2-4 hours
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Address any issues promptly

## Deployment History

### Version 1.2.23 (2025-12-21)

**Changes**:
- Added metrics tracking for Rovo Agent usage
- Integrated metricsTracker into rovoAgent.ts
- Added comprehensive unit tests (73 total)
- Updated documentation

**Deployment**:
- Development: ✅ Deployed successfully
- Production: ✅ Deployed successfully
- Verification: ✅ All checks passed

**Metrics**:
- Deployment time: ~2 minutes
- No errors detected
- All tests passing

## Best Practices

### Before Every Deployment

1. ✅ Run all tests
2. ✅ Run security checks
3. ✅ Review code changes
4. ✅ Update version number
5. ✅ Update documentation

### During Deployment

1. ✅ Deploy to development first
2. ✅ Test thoroughly in development
3. ✅ Deploy to production during low-traffic hours
4. ✅ Monitor logs during deployment
5. ✅ Have rollback plan ready

### After Deployment

1. ✅ Verify all features work
2. ✅ Monitor logs for 24 hours
3. ✅ Collect user feedback
4. ✅ Document any issues
5. ✅ Update deployment history

## Related Documentation

- [Rovo Integration Guide](./rovo-integration.md)
- [Testing Guide](./testing-guide.md)
- [Automation Rules](./automation-rules.md)
- [Forge Documentation](https://developer.atlassian.com/platform/forge/)

## Support

If you encounter issues during deployment:

1. Check Forge logs: `forge logs --tail`
2. Review troubleshooting section above
3. Check Forge status: https://status.developer.atlassian.com/
4. Contact support: support@triageninja.com
