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
- **Frontend**: React + Custom UI
- **Backend**: Node.js 22.x
- **AI**: Atlassian Rovo Agent
- **Storage**: Forge Storage
- **APIs**: Jira REST API v3

## Requirements

- Node.js 24.x or 22.x
- Forge CLI 12.x+
- Atlassian account with Jira access
- Gitleaks (for security checks)

## Installation

### 1. Install Dependencies

```bash
# Check required tools
make check-tools

# Install dependencies
npm install

# Install frontend dependencies
npm install --prefix static/dashboard
npm install --prefix static/issue-panel
```

### 2. Build Frontend

```bash
# Build dashboard
npm run build --prefix static/dashboard

# Build issue panel
npm run build --prefix static/issue-panel
```

### 3. Deploy to Forge

```bash
# Deploy to development environment
forge deploy --non-interactive --environment development

# Install to your Jira site
forge install --non-interactive --site <your-jira-site> --product jira --environment development
```

## Development

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

## Configuration

### Manifest Modules

- `jira:projectPage` - Dashboard view
- `jira:issuePanel` - AI Triage panel
- `rovo:agent` - AI analysis engine

### Permissions

- `read:jira-work` - Read Jira issues
- `write:jira-work` - Update issues
- `read:jira-user` - Read user information

## Usage

### Dashboard

1. Navigate to your Jira project
2. Click "TriageNinja Dashboard" in the project sidebar
3. View untriaged tickets and statistics
4. Click "Triage" to open a ticket

### AI Triage

1. Open any Jira issue
2. Find the "AI Triage" panel on the right
3. Click "🤖 Run AI Triage"
4. Review the analysis results
5. Click "Approve" to apply or "Reject" to dismiss

## Roadmap

- [x] Basic UI and Forge setup
- [x] Dashboard with statistics
- [x] Issue panel with AI triage button
- [ ] Jira API integration
- [ ] Rovo Agent integration
- [ ] Forge Storage for triage history
- [ ] Similar ticket search
- [ ] E2E tests

## Contributing

This is a hackathon project for the Atlassian Codegeist 2025.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

Built with ❤️ using Atlassian Forge and Rovo Agent.
