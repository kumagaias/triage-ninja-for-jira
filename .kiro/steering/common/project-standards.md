# Project Standards (Common)

**⚠️ File Size Limit: Maximum 1000 lines per file**

## Communication Standards

- Agent chat should be conducted in Japanese.
- Files in the `.kiro` directory should be written in Japanese.
- README files should be written in English and kept within 200 lines.
- **GitHub Pull Requests and Issues must be written in English.**
  - Titles, descriptions, and comments should all be in English
  - **Commit messages must also be written in English**
  - PRs and Issues are public information and should be unified in English
- **Code comments must be written in English.**
  - Function, class, and variable description comments
  - Inline comments
  - JSDoc, TSDoc, Python docstrings, etc.
  - Reason: Code may be shared internationally

## Tool Version Management

### .tool-versions

Place a `.tool-versions` file in the project root and define required tools and their versions:

**Required Tools:**
- **Node.js**: 24.x (Active LTS) or 22.x (Maintenance LTS)
- **Terraform**: >= 1.11.0
- **AWS CLI**: >= 2.0
- **Docker**: >= 20.0
- **Gitleaks**: Latest version (for security checks)

**Tool Installation:**

Using asdf (recommended):
```bash
# Install asdf (if not installed)
# macOS: brew install asdf
# Linux: https://asdf-vm.com/guide/getting-started.html

# Add plugins
asdf plugin add nodejs
asdf plugin add terraform

# Install based on .tool-versions
asdf install
```

Manual installation:
```bash
# Check tools
make check-tools

# Install each tool individually
# Node.js: https://nodejs.org/
# Terraform: https://www.terraform.io/downloads.html
# AWS CLI: https://aws.amazon.com/cli/
# Docker: https://www.docker.com/get-started
# Gitleaks: https://github.com/gitleaks/gitleaks
```

### Makefile

Place a `Makefile` in the project root and provide the following commands:

**Tool Management Commands:**
```bash
make check-tools       # Check installation status of required tools
make install-tools     # Install tools via asdf (if asdf is available)
```

**Test Commands:**
```bash
make test              # All tests (unit + security)
make test-unit         # Unit tests only
make test-security     # Security checks only
make security-check    # Security check (alias)
```

**Development Commands:**
```bash
make install           # Install dependencies (automatically runs check-tools)
make clean             # Clean build artifacts
make help              # Display available commands
```

### Test Execution Principles

- All test commands should be accessible from the Makefile
- `make test` should always run both unit tests and security checks
- Tests should return a non-zero exit code on failure
- CI/CD pipelines should run `make test`

## Steering Files Management

### File Size Limits

**⚠️ CRITICAL: Lines per file MUST NOT exceed 500 lines**

**Lines per file:**
- **Recommended**: 300-400 lines
- **Maximum**: 500 lines (HARD LIMIT)
- **If exceeding 500 lines**: MUST split by section immediately

**Split Example:**
```
tech.md (600 lines) → MUST SPLIT
├── tech-development.md    # Development practices (< 500 lines)
└── tech-operations.md     # Operations & deployment (< 500 lines)
```

### File Count Limits

**Total steering files:**
- **Recommended**: 3-5 files
- **Maximum**: 10 files
- **If exceeding 10 files**: Consolidate where possible

### Management Rules

1. **Regular checks**: Check file sizes monthly
2. **Split decision**: MUST split immediately if exceeding 1000 lines
3. **Consolidation decision**: Consider consolidating small files (< 100 lines)
4. **Naming convention**: Use `<category>-<subcategory>.md` format
5. **Cross-references**: Clearly indicate cross-references between split files

### File Size Check Method

```bash
# Check line count of all steering files
wc -l .kiro/steering/*.md .kiro/steering/*/*.md

# Detect files exceeding 500 lines (CRITICAL)
find .kiro/steering -name "*.md" -exec wc -l {} \; | awk '$1 > 500 {print $2 " has " $1 " lines (EXCEEDS LIMIT - MUST SPLIT)"}'
```

## Security Checks

### Overview

Check for sensitive information before commits or pushes. This prevents leakage of AWS credentials, private keys, tokens, etc.

### Tools Used

**Gitleaks** - Sensitive information detection tool
- AWS Access Key ID / Secret Access Key
- Private keys (RSA, DSA, EC)
- GitHub Token / OAuth Token
- Common password and API key patterns

### Setup

1. **Install Gitleaks:**
   ```bash
   # macOS
   brew install gitleaks
   
   # Other platforms
   # https://github.com/gitleaks/gitleaks#installing
   ```

2. **Configuration files:**
   - `.gitleaks.toml` - Detection rules and exclusion settings
   - `scripts/security-check.sh` - Check script
   - `.kiro/hooks/pre-commit-security.json` - Kiro hook configuration

### Execution Methods

**Method 1: Direct script execution**
```bash
./scripts/security-check.sh
```

**Method 2: Kiro agent hook**
1. Open command palette (Cmd/Ctrl + Shift + P)
2. Search for "Agent Hooks"
3. Execute "Security check (pre-commit)"

**Method 3: Execute from Makefile**
```bash
make security-check
```

### Check Content

Script checks the following:

1. **AWS credentials**
   - Access Key ID: `AKIA[0-9A-Z]{16}`
   - Secret Access Key: 40-character alphanumeric string

2. **Private keys**
   - `-----BEGIN PRIVATE KEY-----` pattern

3. **GitHub Token**
   - Personal Access Token: `ghp_[0-9a-zA-Z]{36}`
   - OAuth Token: `gho_[0-9a-zA-Z]{36}`

4. **Common passwords/API keys**
   - Patterns like `password=`, `api_key=`

### Exclusion Settings

The following files are automatically excluded:
- Markdown files (`.md`)
- `package-lock.json`
- `.gitleaks.toml` (configuration file itself)

### Error Response

When sensitive information is detected:

1. **Remove sensitive information from detected files**
2. **Move to environment variables**
   - `.env.local` (gitignored)
   - AWS Secrets Manager
   - Set as environment variables
3. **Add to `.gitignore` as needed**
4. **If already committed**
   - Remove from Git history (`git filter-branch` or `BFG Repo-Cleaner`)
   - Rotate credentials (invalidate and reissue)

### Best Practices

- Always run security checks before commits
- Manage sensitive information with environment variables
- Include `.env` files in `.gitignore`
- Use placeholders like `your-api-key-here` in sample code
- Manage production credentials with AWS Secrets Manager

## Git Push Branch Restrictions

### Pre-push Hook

A pre-push hook enforces branch naming conventions:

**Allowed branches:**
- `feat/*` - New features
- `fix/*` - Bug fixes
- `test/*` - Test additions
- `refactor/*` - Code refactoring
- `main` - Only for PR merges (blocked for direct push)

**Blocked branches:**
- Direct push to `main` is prohibited
- All other branch patterns

### Hook Location

`.git/hooks/pre-push`

### Testing

```bash
# Test allowed branch
git checkout -b feat/test-feature
git push origin feat/test-feature  # ✅ Allowed

# Test blocked branch
git checkout -b docs/test-docs
git push origin docs/test-docs  # ❌ Blocked
```

## Automated Development Flow

### Quick Start

```bash
make dev-flow
```

This automated script handles:
1. Branch creation (feat/fix/test/refactor)
2. Development phase
3. Commit and push
4. PR creation
5. Copilot review request (automatic)
6. Wait 3 minutes for Copilot analysis
7. Display Copilot comments
8. **User must manually merge PR**

### Script Location

`scripts/auto-dev-flow.sh`

### Requirements

- GitHub CLI (`gh`) installed and authenticated
- Must be on `main` branch
- No uncommitted changes
- Pre-push hook enforces branch patterns

### Workflow

1. Select branch type (feat/fix/test/refactor)
2. Enter branch description
3. Develop feature
4. Press ENTER to continue
5. Enter commit message
6. Enter PR title and description
7. Wait for Copilot review (3 minutes)
8. Review Copilot comments
9. **Manually merge PR after approval**

### Important Notes

- ⚠️ **Merge is NOT automated** - User must manually merge
- Script stays on feature branch after completion
- User can continue making changes
- Pre-push hook prevents accidental push to main

## Documentation Requirements

Create and maintain the following documentation files:

- `product.md` - Product specifications (features, user flows, glossary)
- `tech.md` - Technical architecture and design decisions
- `tech-common.md` - General best practices
- `structure.md` - Project structure and organization
- `project-standards.md` - Project standards (this file)
- `review.md` - Code review response guide
- `postmortem.md` - Postmortem guidelines

### Documentation Update Rules

**When product specifications change:**
1. **Always update `product.md`**
2. Reflect new features, specification changes, performance improvements, etc.
3. Record changes in the update history section

**When technical implementation changes:**
1. **Update `tech.md`** (architecture, performance optimization, etc.)
2. **Update `tech-common.md`** (general best practices)

**When project structure changes:**
1. **Update `structure.md`**

**Update Timing:**
- When feature implementation is complete
- When creating a PR
- When specifications change

These files must be updated whenever there are related changes.

## Commit Message Convention

**Language: Write in English**

**Format:**
```
<type>: <subject> (task-X.X)

<body>

Task: X.X
```

**Type:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (whitespace, formatting)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Changes to build process or tools

**Example:**
```
feat: Set up Hono application (task-1.1)

- Create backend/src/app.ts
- Implement GET /api/health endpoint
- Add CORS and logging middleware
- Verify local server starts successfully

Task: 1.1
```

## Branch Naming Convention

**Format:**
```
<type>/<issue-number>-<short-description>
```

**Examples:**
- `feat/task-1.1-setup-hono-app`
- `fix/42-newspaper-generation-error`
- `test/15-add-unit-tests`
- `refactor/31-improve-layout-algorithm`

## Agent Hooks

Create agent hooks to automate quality checks:

### Available Hooks

1. **Run unit tests** (`.kiro/hooks/run-tests.json`)
   - Command: `make test-unit`
   - Purpose: Run unit tests only
   - Trigger: Manual execution

2. **Run all tests** (`.kiro/hooks/run-all-tests.json`)
   - Command: `make test`
   - Purpose: Unit tests + security checks
   - Trigger: Auto-execute on task completion

3. **Security check** (`.kiro/hooks/pre-commit-security.json`)
   - Command: `make security-check`
   - Purpose: Check for sensitive information before commit
   - Trigger: Manual execution

### How to Execute Hooks

**Method 1: Command Palette (Recommended)**
1. Open command palette with `Cmd + Shift + P` (macOS) or `Ctrl + Shift + P` (Windows/Linux)
2. Search for "Agent Hooks"
3. Select the hook you want to execute

**Method 2: Agent Hooks View**
1. Open "Agent Hooks" section in sidebar
2. Click the hook you want to execute

**Method 3: Execute directly from Makefile**
```bash
make test-unit          # Unit tests only
make test               # All tests
make security-check     # Security check only
```

### Hook Creation Guidelines

- Place hook definition files in `.kiro/hooks/`
- Write in JSON format
- Use clear Japanese for `name`
- Clearly describe purpose in `description`
- Use Makefile commands for `command`
- `trigger.type` should generally be `manual`

## Project Initialization

**First Steps (in order):**

1. **Security checks (MANDATORY)**
   ```bash
   make check-tools
   brew install gitleaks  # if needed
   make security-check
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Set up Forge**
   ```bash
   forge login
   forge deploy --environment development
   forge install --environment development
   ```

**Why security first?**
- Prevents accidental commit of sensitive data
- Establishes security-first culture
- Required for all projects

## GitHub MCP Setup

**Prerequisites:**
- GitHub Personal Access Token with `repo` and `workflow` scopes

**Configuration:**
```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "github": {
      "command": "uvx",
      "args": ["mcp-server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Environment variable (recommended):**
```bash
# ~/.zshrc or ~/.bashrc
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"
```

## Related Documents

- **Common Standards**: `common/project-standards.md`
- **Technical Architecture**: `tech.md`
- **Common Tech Standards**: `common/tech.md`
