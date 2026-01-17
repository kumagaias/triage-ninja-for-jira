# Project Standards (TriageNinja)

**⚠️ File Size Limit: Maximum 1000 lines per file**

## References

- **Global Best Practices**: [kiro-best-practices](https://github.com/kumagaias/kiro-best-practices)
- **Technical Architecture**: `.kiro/steering/tech.md`
- **Spec**: `.kiro/specs/issue-16-rovo-agent-integration/`

## Development Flow

### Automated Flow (Recommended)

```bash
make dev-flow
```

**Steps:**
1. Branch creation (feat/fix/test/refactor)
2. Development
3. Commit and push
4. PR creation
5. Copilot review (automatic, 3 min wait)
6. Display Copilot comments
7. **User manually merges PR**

**Requirements:**
- GitHub CLI (`gh`) installed and authenticated
- Must be on `main` branch
- Pre-push hook enforces branch naming

### Manual Flow

**Branch Naming:**
- `feat/task-X.X-description` - New feature
- `fix/issue-X-description` - Bug fix
- `test/description` - Test addition
- `refactor/description` - Refactoring

**Git Push Rules:**
- ✅ Allowed: `feat/*`, `fix/*`, `test/*`, `refactor/*`
- ❌ Prohibited: Direct push to `main`, wildcard push
- Main branch ONLY updated via PR merge

**Workflow:**
1. Create branch: `git checkout -b feat/task-1.1-description`
2. Develop and test: `make test`, `forge tunnel`
3. Commit: Include task/issue number
4. Push: `git push origin feat/task-1.1-description`
5. Create PR on GitHub
6. Review and merge

## Bug Fix Workflow

**Mandatory Steps:**

1. **Create GitHub Issue** (via GitHub MCP)
2. **Create fix branch**: `fix/issue-42-description`
3. **Fix and test**: `make test`, `forge tunnel`
4. **Commit**: Include `Fixes #42`
5. **Create PR** (via GitHub MCP)
6. **Request Copilot review** (via GitHub MCP)
7. **Check Copilot comments** (via GitHub MCP)
8. **Code review**
9. **Get user approval**
10. **Merge PR** (via GitHub MCP)

**Checklist:**
- [ ] Created GitHub Issue
- [ ] Created fix branch (not on main)
- [ ] Included issue number in commit
- [ ] Requested Copilot review
- [ ] Checked Copilot comments
- [ ] Got user approval before merge

## Spec Implementation

### Current Priority: Rovo Agent Integration

**Directory**: `.kiro/specs/issue-16-rovo-agent-integration/`

**Tasks:**
- [ ] Task 1: Implement Rovo Actions (7 subtasks)
- [ ] Task 2: Create Jira Automation Rules (4 subtasks)
- [ ] Task 3: Update Frontend (5 subtasks)
- [ ] Task 4: Implement Fallback Logic (4 subtasks)
- [ ] Task 5: Logging and Monitoring (4 subtasks)
- [ ] Task 6: Testing (3 subtasks)
- [ ] Task 7: Documentation (3 subtasks)

**Rules:**
1. Follow order
2. Complete each spec fully
3. Write tests for all requirements
4. Update documentation
5. Code review on completion
6. Close issue when done

### Acceptance Criteria Format

```markdown
- [ ] Task name
  - **Acceptance Criteria:**
    - [ ] Specific verifiable condition
    - [ ] Specific verifiable condition
```

**Good Example:**
- [ ] `src/actions/analyzeTicketClassification.ts` created
- [ ] Function fetches ticket data from Jira API
- [ ] Unit tests pass with 100% coverage

**Bad Example:**
- [ ] Works correctly (❌ Ambiguous)
- [ ] Write clean code (❌ Not verifiable)

## Deployment

### Deployment Timing

Deploy proactively when:
1. Forge app changes complete
2. Feature unit complete
3. Bug fix complete

### Deployment Commands

```bash
# Development
forge deploy --environment development
forge install --upgrade --environment development
forge tunnel  # Local testing

# Production
forge deploy --environment production
forge install --upgrade --environment production
```

### Verification

1. Test with `forge tunnel`
2. Test in actual Jira site
3. Verify from UI
4. Check Forge logs

### E2E Testing

**Tests:**
- `e2e/triage-flow.spec.ts`
- `e2e/rovo-agent-integration.spec.ts`
- `e2e/fallback-logic.spec.ts`

**Execution:**
```bash
npm run test:e2e
npx playwright test e2e/triage-flow.spec.ts
```

## Forge-Specific Standards

### Forge CLI

```bash
forge deploy --environment development
forge install --upgrade --environment development
forge tunnel
forge logs --environment development --tail
```

### Manifest Updates

When updating `manifest.yml`:
1. Run `forge lint`
2. Redeploy: `forge deploy`
3. Reinstall if scopes changed: `forge install --upgrade`
4. Test with `forge tunnel`

### UI Kit Components

**MUST use @forge/react only:**
- ✅ Use: `Button`, `Text`, `Stack`, `DynamicTable`
- ❌ Do NOT use: `<div>`, `<span>`, HTML/React components
- ❌ Do NOT use: `@forge/ui` (deprecated)

### API Security

- ✅ Prefer `.asUser()` (includes authorization)
- ⚠️ Use `.asApp()` with caution (manual authorization required)
- Minimize scopes in manifest.yml

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

- **Global Best Practices**: [kiro-best-practices](https://github.com/kumagaias/kiro-best-practices)
- **Technical Architecture**: `tech.md`
