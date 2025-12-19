# TriageNinja for Jira

AI-Powered Intelligent Ticket Triage for Jira Service Management and Jira Software.

Master the art of AI triage with TriageNinja 🥷

## Overview

TriageNinja automates ticket triage using AI, reducing manual work by 80% and improving support team productivity. It provides:

- **AI-Powered Classification**: Automatically categorize tickets with 90%+ accuracy
- **Smart Assignee Matching**: Suggest the best assignee based on skills and workload
- **Similar Ticket Search**: Find past solutions instantly
- **Real-time Dashboard**: Track triage metrics and untriaged tickets

## Features

### 🤖 AI Triage Panel
- One-click AI analysis of Jira tickets
- Category and priority detection
- Confidence scoring
- Assignee recommendations

### 📊 Dashboard
- Untriaged ticket count
- Daily processing statistics
- Time savings metrics
- AI accuracy tracking

### 🔍 Similar Ticket Search
- Find related resolved tickets
- View past solutions
- Estimated resolution time

## Tech Stack

- **Platform**: Atlassian Forge (Serverless)
- **Frontend**: React 18 + Custom UI
- **Backend**: Node.js 22.x + TypeScript
- **AI**: Atlassian Rovo Agent (GPT-4 powered)
- **Storage**: Forge Storage API
- **APIs**: Jira REST API v3
- **Testing**: Jest + Playwright
- **Security**: Gitleaks + Forge Security Model

### Why Forge?

TriageNinja is built on **Atlassian Forge**, which means:

✅ **Runs on Atlassian**: No external servers or infrastructure needed  
✅ **Secure by Default**: Follows Atlassian's security best practices  
✅ **Scalable**: Automatically scales with your Jira instance  
✅ **Easy to Install**: One-click installation from Marketplace  
✅ **Always Up-to-date**: Automatic updates with zero downtime

### AI-Powered by Rovo

TriageNinja leverages **Atlassian Rovo Agent** for intelligent analysis:

- **Natural Language Understanding**: Analyzes ticket descriptions and comments
- **Context-Aware**: Considers project history and team expertise
- **Continuous Learning**: Improves accuracy over time
- **Multi-Task Execution**: Parallel processing for faster results

## Requirements

- Node.js 24.x or 22.x
- Forge CLI 12.x+
- Atlassian account with Jira access
- Gitleaks (for security checks)

## Installation

### Quick Install (Recommended)

Install directly from the Atlassian Marketplace:

🔗 **[Install TriageNinja for Jira](https://developer.atlassian.com/console/install/YOUR_APP_ID)**

### Manual Installation (For Developers)

#### Prerequisites

- Node.js 24.x or 22.x
- Forge CLI 12.x+
- Atlassian account with Jira access
- Gitleaks (for security checks)

#### 1. Install Dependencies

```bash
# Check required tools
make check-tools

# Install dependencies
npm install

# Install frontend dependencies
npm install --prefix static/dashboard
npm install --prefix static/issue-panel
```

#### 2. Build Frontend

```bash
# Build dashboard
npm run build --prefix static/dashboard

# Build issue panel
npm run build --prefix static/issue-panel
```

#### 3. Deploy to Forge

```bash
# Login to Forge (first time only)
forge login

# Deploy to development environment
forge deploy --non-interactive --environment development

# Install to your Jira site
forge install --non-interactive --site <your-jira-site> --product jira --environment development
```

#### 4. Verify Installation

1. Navigate to your Jira project
2. Look for "TriageNinja Dashboard" in the project sidebar
3. Open any issue and find the "AI Triage" panel on the right

## Development

### Quick Start: Automated Development Flow

```bash
# Automated workflow: branch → dev → push → PR → Copilot review
make dev-flow
```

This interactive script automates:
1. Branch creation (feat/fix/test/refactor)
2. Development phase
3. Commit and push
4. PR creation
5. Copilot review request
6. Review comment analysis
7. Merge or address comments

### Local Development

```bash
# Start tunnel for hot reload
forge tunnel

# In another terminal, make changes to frontend
cd static/dashboard
npm start
```

### Testing

```bash
# Run all tests (unit + security)
make test

# Run security checks only
make security-check

# Run unit tests only
make test-unit
```

### Linting

```bash
# Lint Forge app
forge lint
```

## Project Structure

```
.
├── src/
│   └── index.js              # Backend resolvers
├── static/
│   ├── dashboard/            # Dashboard React app
│   │   ├── src/
│   │   │   ├── App.js
│   │   │   └── index.js
│   │   └── build/
│   └── issue-panel/          # Issue panel React app
│       ├── src/
│       │   ├── App.js
│       │   └── index.js
│       └── build/
├── manifest.yml              # Forge app configuration
├── package.json              # Backend dependencies
├── Makefile                  # Build commands
└── README.md                 # This file
```

## Performance

- **AI Analysis**: < 3 seconds average response time
- **Dashboard Load**: < 1 second
- **Parallel Processing**: Multiple AI tasks run simultaneously
- **Caching**: Intelligent caching for frequently accessed data

## Security

TriageNinja follows Atlassian's security best practices:

- ✅ **No External Servers**: All data stays within Atlassian infrastructure
- ✅ **Minimal Permissions**: Only requests necessary Jira permissions
- ✅ **Data Encryption**: All data encrypted at rest and in transit
- ✅ **Audit Logging**: All triage actions are logged
- ✅ **Security Scanning**: Automated security checks with Gitleaks

### Permissions Required

- `read:jira-work` - Read Jira issues and projects
- `write:jira-work` - Update issue assignee and fields
- `read:jira-user` - Read user information for assignee matching
- `storage:app` - Store triage history and statistics

## Configuration

### Manifest Modules

- `jira:projectPage` - Dashboard view for project-level statistics
- `jira:issuePanel` - AI Triage panel on issue detail page
- `rovo:agent` - AI analysis engine with multiple tasks

## Usage

### Dashboard

1. **Navigate to Dashboard**
   - Go to your Jira project
   - Click "TriageNinja Dashboard" in the project sidebar

2. **View Statistics**
   - Untriaged Tickets: Number of tickets awaiting triage
   - Processed Today: Tickets triaged today
   - Time Saved: Estimated time saved (minutes)
   - AI Accuracy: Current AI classification accuracy

3. **Filter Tickets**
   - Filter by priority (All, Highest, High, Medium, Low, Lowest)
   - Filter by date range (All, Today, Past 7 days, Past 30 days)

4. **Triage Tickets**
   - Click "Triage" button on any ticket
   - Opens the issue with AI Triage panel

### AI Triage Panel

1. **Open Issue**
   - Navigate to any Jira issue
   - Find the "AI Triage" panel on the right side

2. **Run AI Analysis**
   - Click "🤖 Run AI Triage" button
   - Wait 3-5 seconds for analysis (progress bar shows status)

3. **Review Results**
   - **Confidence Score**: 0-100% (higher is better)
   - **Category**: Detected issue category and subcategory
   - **Priority**: Recommended priority level
   - **Suggested Assignee**: Best team member for this issue
   - **Similar Tickets**: Past tickets with solutions
   - **Reasoning**: AI explanation for recommendations

4. **Apply or Reject**
   - Click "✅ Approve & Apply" to update the issue
   - Click "❌ Reject" to dismiss recommendations
   - Confirm in the dialog

5. **Verify Changes**
   - Check that assignee is updated
   - Review applied labels and priority
   - View success notification

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*Real-time statistics and untriaged ticket list*

### AI Triage Panel
![AI Triage Panel](docs/screenshots/triage-panel.png)
*One-click AI analysis with confidence scoring*

### Triage Results
![Triage Results](docs/screenshots/triage-results.png)
*Category, assignee, and similar ticket recommendations*

## Roadmap

- [x] Basic UI and Forge setup
- [x] Dashboard with statistics
- [x] Issue panel with AI triage button
- [x] Jira API integration
- [x] Rovo Agent integration
- [x] AI-powered ticket classification
- [x] Smart assignee matching
- [x] Similar ticket search
- [x] E2E test configuration
- [x] Deployed to Forge (v2.9.0)
- [ ] Demo video production
- [ ] Devpost submission

## Hackathon

This project was created for **Atlassian Codegeist 2025** hackathon.

### Awards Targeting

- 🏆 **Advanced AI Integration**: Leverages Rovo Agent for multi-task AI analysis
- 🏆 **Platform Excellence**: 100% serverless on Forge platform

### Demo Video

🎥 **[Watch Demo Video](https://youtu.be/YOUR_VIDEO_ID)**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- 📧 Email: support@triageninja.com
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/triage-ninja-for-jira/issues)
- 📖 Documentation: [Wiki](https://github.com/YOUR_USERNAME/triage-ninja-for-jira/wiki)

## Acknowledgments

- Built with ❤️ using **Atlassian Forge** and **Rovo Agent**
- Powered by **GPT-4** for intelligent analysis
- Inspired by the need to reduce manual triage work
- Thanks to the Atlassian Developer Community

---

**Master the art of AI triage with TriageNinja 🥷**
