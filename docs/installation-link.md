# TriageNinja Installation Link

## App Information

- **App Name**: TriageNinja for Jira
- **App ID**: `ari:cloud:ecosystem::app/81023c08-dbac-4cd9-8835-f1fe99bbb17c`
- **Version**: 2.9.0
- **Platform**: Atlassian Forge
- **Products**: Jira Software, Jira Service Management

## Installation Links

### Development Environment

For testing and development:

```
https://developer.atlassian.com/console/install/81023c08-dbac-4cd9-8835-f1fe99bbb17c?environment=development
```

### Production Environment

For production use (after approval):

```
https://developer.atlassian.com/console/install/81023c08-dbac-4cd9-8835-f1fe99bbb17c?environment=production
```

## Manual Installation

If you prefer to install manually:

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Find "TriageNinja for Jira"
3. Click "Install"
4. Select your Jira site
5. Choose environment (development or production)
6. Click "Install"

## Installation via Forge CLI

For developers:

```bash
# Install to development environment
forge install --non-interactive \
  --site your-site.atlassian.net \
  --product jira \
  --environment development

# Install to production environment
forge install --non-interactive \
  --site your-site.atlassian.net \
  --product jira \
  --environment production
```

## Current Installations

The app is currently installed on:

1. **kumagaias-development.atlassian.net** (Development)
   - Environment: development
   - Version: 2.9.0
   - Status: Active

2. **kumagaias.atlassian.net** (Production)
   - Environment: development
   - Version: 2.9.0
   - Status: Active

## Verification

After installation, verify the app is working:

1. **Dashboard**: Navigate to any Jira project → "TriageNinja Dashboard" in sidebar
2. **Issue Panel**: Open any issue → "AI Triage" panel on the right
3. **Test**: Click "Run AI Triage" button and verify analysis works

## Permissions Required

The app requires the following permissions:

- `read:jira-work` - Read Jira issues and projects
- `write:jira-work` - Update issue assignee and fields
- `read:jira-user` - Read user information for assignee matching

## Support

If you encounter any issues during installation:

- Check [Forge CLI documentation](https://developer.atlassian.com/platform/forge/cli-reference/)
- Review [Installation troubleshooting](https://developer.atlassian.com/platform/forge/troubleshooting/)
- Contact support: support@triageninja.com

## For Hackathon Judges

To test TriageNinja:

1. Use the development installation link above
2. Install to your Jira test site
3. Navigate to any project to see the dashboard
4. Open any issue to see the AI Triage panel
5. Click "Run AI Triage" to see AI analysis in action

**Note**: The app is currently in development and requires Forge CLI for installation. After hackathon approval, it will be available on the Atlassian Marketplace for one-click installation.
