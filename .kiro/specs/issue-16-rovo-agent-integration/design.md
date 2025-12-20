# Design Document: Rovo Agent Integration

## Overview

After researching the Atlassian Forge Rovo Agent API, we have discovered that **Rovo Agent can be invoked through Jira Automation rules for fully automated ticket triage**. This approach eliminates the need for user interaction while leveraging Rovo Agent's advanced AI capabilities.

This design document proposes an architecture that uses **Jira Automation + Rovo Agent Actions** to automatically analyze and triage tickets when they are created or updated.

## Architecture

### Current Architecture (Keyword-based)

```
User clicks "Run AI Triage"
  ↓
Frontend calls resolver
  ↓
Resolver calls rovoAgent.classifyTicket()
  ↓
Keyword matching logic
  ↓
Returns classification result
  ↓
Display in UI
```

### Proposed Architecture (Jira Automation + Rovo Agent)

```
Ticket Created/Updated
  ↓
Jira Automation Rule Triggered
  ↓
Automation invokes Rovo Agent
  ↓
Rovo Agent calls custom Actions:
  - analyze-ticket-classification
  - suggest-ticket-assignee
  ↓
Actions fetch data and return to Rovo Agent
  ↓
Rovo Agent analyzes with AI (LLM)
  ↓
Rovo Agent returns structured result
  ↓
Automation updates ticket fields:
  - Assignee
  - Labels (category, priority)
  - Custom fields
  ↓
Ticket automatically triaged!
```

### Hybrid Approach

We maintain **three triage methods**:

**Method 1: Automatic (Jira Automation + Rovo Agent)** - Primary
- Triggers on ticket creation
- Fully automated, no user interaction
- Uses Rovo Agent's AI for analysis
- Updates ticket automatically

**Method 2: Manual (UI Button + Jira Automation + Rovo Agent)** - On-Demand
- User clicks "Run AI Triage" button
- Triggers Jira Automation rule manually
- Uses Rovo Agent's AI for analysis
- Updates ticket after analysis

**Method 3: Fallback (Keyword-based)** - Emergency Only
- Used when Rovo Agent/Automation is unavailable
- Keyword-based classification
- Workload-based assignment
- Immediate results, no external dependencies

This provides:
- ✅ **Automatic triage** for new tickets (AI-powered)
- ✅ **Manual triage** for existing tickets (AI-powered, on-demand)
- ✅ **Fallback triage** when AI is unavailable (keyword-based)
- ✅ **Consistent AI analysis** across automatic and manual modes
- ✅ **No breaking changes** to existing functionality

## Components and Interfaces

### 1. Rovo Agent Module (manifest.yml)

Already defined in manifest.yml:
```yaml
rovo:agent:
  - key: triageninja-agent
    name: TriageNinja AI Agent
    description: AI-powered ticket triage assistant
    prompt: |
      You are TriageNinja, an AI assistant specialized in Jira ticket triage.
      
      Your capabilities:
      1. Classify tickets into categories and subcategories
      2. Determine priority (High/Medium/Low) and urgency (Urgent/Normal)
      3. Suggest optimal assignees based on skills and workload
      4. Find similar past tickets and their solutions
      
      When analyzing tickets:
      - Consider the summary and description carefully
      - Look for keywords indicating urgency or priority
      - Match categories based on technical domains
      - Provide confidence scores (0-100)
      - Always explain your reasoning
      
      Respond in JSON format as specified in each request.
    actions:
      - analyze-ticket-classification
      - suggest-ticket-assignee
      - find-similar-tickets
```

### 2. Rovo Actions (New)

Define three actions that Rovo Agent can invoke:

#### Action 1: analyze-ticket-classification

```yaml
action:
  - key: analyze-ticket-classification
    name: Analyze Ticket Classification
    function: analyzeTicketClassification
    actionVerb: GET
    description: |
      Analyze a Jira ticket and determine its category, subcategory, 
      priority, and urgency based on the summary and description.
    inputs:
      issueKey:
        title: Issue Key
        type: string
        required: true
        description: "The Jira issue key (e.g., SUP-123)"
```

**Function Implementation:**
```typescript
export async function analyzeTicketClassification(payload, context) {
  const { issueKey } = payload;
  const { accountId } = context;
  
  // Fetch ticket data
  const ticket = await fetchTicketData(issueKey);
  
  // Return structured data for Rovo Agent to interpret
  return {
    issueKey,
    summary: ticket.summary,
    description: ticket.description,
    reporter: ticket.reporter.displayName,
    created: ticket.created,
    suggestedCategory: "Network & Connectivity", // AI will determine this
    suggestedSubCategory: "VPN",
    suggestedPriority: "High",
    suggestedUrgency: "Urgent",
    reasoning: "Contains keywords: VPN, connection, urgent"
  };
}
```

#### Action 2: suggest-ticket-assignee

```yaml
action:
  - key: suggest-ticket-assignee
    name: Suggest Ticket Assignee
    function: suggestTicketAssignee
    actionVerb: GET
    description: |
      Suggest the best assignee for a ticket based on category, 
      team member skills, current workload, and historical performance.
    inputs:
      issueKey:
        title: Issue Key
        type: string
        required: true
        description: "The Jira issue key"
      category:
        title: Category
        type: string
        required: true
        description: "The ticket category"
```

**Function Implementation:**
```typescript
export async function suggestTicketAssignee(payload, context) {
  const { issueKey, category } = payload;
  
  // Fetch available agents with workload
  const agents = await fetchAvailableAgents();
  
  // Calculate workload for each agent
  const agentsWithWorkload = await Promise.all(
    agents.map(async (agent) => ({
      ...agent,
      currentLoad: await calculateWorkload(agent.accountId)
    }))
  );
  
  // Return data for Rovo Agent to analyze
  return {
    issueKey,
    category,
    availableAgents: agentsWithWorkload,
    recommendation: agentsWithWorkload[0].displayName,
    reasoning: `Lowest workload (${agentsWithWorkload[0].currentLoad} tickets)`
  };
}
```

#### Action 3: find-similar-tickets

```yaml
action:
  - key: find-similar-tickets
    name: Find Similar Tickets
    function: findSimilarTickets
    actionVerb: GET
    description: |
      Find similar past tickets based on summary and description 
      to help with resolution.
    inputs:
      issueKey:
        title: Issue Key
        type: string
        required: true
        description: "The Jira issue key"
```

### 3. Jira Automation Rule Configuration

Create **two** Jira Automation rules:

#### Rule 1: Automatic Triage (On Ticket Creation)

**Trigger:** Issue Created
**Condition:** Issue type = Support Request (or any type)
**Action:** Invoke Rovo Agent

```yaml
name: "Auto-Triage New Tickets"
trigger:
  type: issue_created
conditions:
  - issue_type: ["Support Request", "Bug", "Task"]
  - assignee: EMPTY
actions:
  - type: invoke_rovo_agent
    agent_key: triageninja-agent
    prompt: |
      Analyze this ticket and provide:
      1. Category and subcategory
      2. Priority (High/Medium/Low)
      3. Suggested assignee
      
      Return results in JSON format.
  - type: update_issue
    fields:
      assignee: "{{rovoAgent.suggestedAssignee}}"
      labels: ["{{rovoAgent.category}}", "{{rovoAgent.priority}}"]
      customfield_10001: "{{rovoAgent.confidence}}"
```

#### Rule 2: Manual Triage (On Label Added)

**Trigger:** Issue Updated
**Condition:** Label "run-ai-triage" added
**Action:** Invoke Rovo Agent

```yaml
name: "Manual Triage on Demand"
trigger:
  type: issue_updated
  field: labels
conditions:
  - label_added: "run-ai-triage"
actions:
  - type: invoke_rovo_agent
    agent_key: triageninja-agent
    prompt: |
      Analyze this ticket and provide:
      1. Category and subcategory
      2. Priority (High/Medium/Low)
      3. Suggested assignee
      
      Return results in JSON format.
  - type: update_issue
    fields:
      assignee: "{{rovoAgent.suggestedAssignee}}"
      labels: ["{{rovoAgent.category}}", "{{rovoAgent.priority}}"]
  - type: remove_label
    label: "run-ai-triage"
```

**Note:** The exact syntax depends on Jira Automation's Rovo Agent integration, which is documented in Atlassian's automation documentation.

### 4. Frontend Integration (Manual Trigger)

Update the "Run AI Triage" button to trigger automation:

```javascript
// static/issue-panel/src/App.js

const handleRunAITriage = async () => {
  setIsAnalyzing(true);
  
  try {
    // Add label to trigger automation
    await invoke('addLabelToIssue', {
      issueKey,
      label: 'run-ai-triage'
    });
    
    // Poll for completion (label removed by automation)
    await pollForTriageCompletion(issueKey);
    
    // Refresh issue data
    await fetchIssueData();
    
    setIsAnalyzing(false);
    showSuccessMessage('AI triage completed!');
  } catch (error) {
    console.error('Triage failed, using fallback:', error);
    
    // Fallback to keyword-based triage
    await runFallbackTriage();
    setIsAnalyzing(false);
  }
};
```

### 5. Keep Existing Keyword-based Triage as Fallback

**Important:** We keep the existing keyword-based triage as emergency fallback:
- Used only when Rovo Agent/Automation is unavailable
- Provides immediate results without external dependencies
- Ensures system remains functional during outages

This ensures:
- Resilience during Rovo Agent outages
- No complete system failure
- Graceful degradation

## Data Models

### Ticket Data Structure

```typescript
interface TicketData {
  issueKey: string;
  summary: string;
  description: string;
  reporter: {
    accountId: string;
    displayName: string;
  };
  created: string;
  status: string;
  priority: string;
}
```

### Agent Data Structure

```typescript
interface AgentData {
  accountId: string;
  displayName: string;
  emailAddress: string;
  currentLoad: number;
  skills: string[];
}
```

### Classification Result

```typescript
interface ClassificationResult {
  category: string;
  subCategory: string;
  priority: 'High' | 'Medium' | 'Low';
  urgency: 'Urgent' | 'Normal';
  confidence: number;
  reasoning: string;
  tags: string[];
  source: 'rovo-agent' | 'keyword-based';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Action data completeness
*For any* Rovo Action invocation, the returned data should include all required fields for the AI to make an informed decision
**Validates: Requirements 1.1, 2.1**

### Property 2: Fallback consistency
*For any* ticket analysis request, if Rovo Agent is unavailable, the system should return results using keyword-based logic with confidence scores below 70%
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 3: Workload calculation accuracy
*For any* agent, the calculated workload should equal the count of tickets where `assignee = accountId AND statusCategory != Done`
**Validates: Requirements 2.1**

### Property 4: Action response format
*For any* Rovo Action, the response should be valid JSON or a string that Rovo Agent can interpret
**Validates: Requirements 1.2, 2.2**

### Property 5: Error handling graceful degradation
*For any* error in Rovo Action execution, the system should log the error and return a meaningful message without crashing
**Validates: Requirements 4.4, 4.5**

## Error Handling

### Rovo Agent Unavailable
- User clicks "Ask Rovo Agent" but Rovo is not available
- Show error message: "Rovo Agent is not available. Please use automated triage instead."
- Fallback to automated triage button

### Action Execution Failure
- Rovo Action throws an error
- Log error with context
- Return error message to Rovo Agent
- Rovo Agent explains the error to user in natural language

### Invalid Input
- Action receives invalid issueKey
- Validate input before processing
- Return clear error message

## Testing Strategy

### Unit Tests
- Test each Rovo Action function independently
- Mock Jira API responses
- Verify data structure and completeness
- Test error handling paths

### Integration Tests
- Test Rovo Agent invocation from UI
- Verify Actions are called correctly
- Test fallback to automated triage
- Verify logging and monitoring

### Manual Testing
- Open Rovo chat from issue panel
- Ask Rovo Agent to analyze a ticket
- Verify Actions are invoked
- Check natural language responses
- Test error scenarios

## Implementation Notes

### Why Jira Automation + Rovo Agent?

After extensive research, we found that:
1. **No `requestRovo()` method exists** in Forge API for direct backend calls
2. **Rovo Agent can be invoked by Jira Automation** - fully automated, no user interaction required
3. **Actions provide data** to Rovo Agent for AI analysis
4. **Automation updates tickets** based on Rovo Agent's response

### Key Advantages

**Jira Automation + Rovo Agent:**
- ✅ **Fully automated** - triggers on ticket creation
- ✅ **No user interaction** required
- ✅ **AI-powered analysis** via Rovo Agent's LLM
- ✅ **Officially supported** by Atlassian
- ✅ **Scalable** - handles all new tickets automatically

**Compared to alternatives:**
- ❌ Direct API calls: Not supported by Forge
- ❌ Interactive chat: Requires user interaction
- ✅ Automation: Perfect for automated triage

### Recommended Approach

**Dual-Mode System:**
1. **Automatic Mode** (New): Jira Automation + Rovo Agent
   - Triggers on ticket creation
   - AI-powered analysis
   - Automatic ticket updates
   
2. **Manual Mode** (Existing): UI Button + Keyword Logic
   - User clicks "Run AI Triage"
   - Fast keyword-based analysis
   - Immediate results

This approach:
- ✅ Uses officially supported APIs
- ✅ Maintains existing functionality
- ✅ Adds AI capabilities through Rovo Agent
- ✅ Provides automatic triage for new tickets
- ✅ Future-proof (aligned with Atlassian's AI strategy)
- ✅ No breaking changes

## Deployment Considerations

### Manifest Changes Required
- Add three new `action` modules
- Add three new `function` definitions
- Update `rovo:agent` to reference actions
- Add `read:chat:rovo` scope for customer-built agents (optional)

### Jira Automation Configuration Required
- Create automation rule for ticket creation
- Configure Rovo Agent invocation
- Map Rovo Agent response to ticket fields
- Test automation rule with sample tickets

### Backend Changes Required
- Implement three Action functions
- Reuse existing data fetching logic
- Add structured data formatting for Rovo Agent

### No Breaking Changes
- Existing automated triage remains unchanged
- Backward compatible
- Progressive enhancement

## Conclusion

This design proposes a **three-tier triage system** that:

1. **Automatic Mode** (Primary): Jira Automation + Rovo Agent for new tickets
   - Fully automated, AI-powered triage
   - Triggers on ticket creation
   - No user interaction required
   
2. **Manual Mode** (On-Demand): UI Button + Jira Automation + Rovo Agent
   - User-initiated AI triage
   - Same AI analysis as automatic mode
   - Consistent results across modes
   
3. **Fallback Mode** (Emergency): Keyword-based logic
   - Used only when Rovo Agent is unavailable
   - Ensures system remains functional
   - Graceful degradation

The key insight is that **both automatic and manual triage use Jira Automation + Rovo Agent** for consistent AI-powered analysis. The keyword-based logic is relegated to emergency fallback only.

### Next Steps

1. Implement Rovo Actions (analyze-ticket-classification, suggest-ticket-assignee)
2. Test Actions independently
3. Create two Jira Automation rules (automatic + manual)
4. Update UI button to trigger manual automation
5. Implement polling mechanism for completion detection
6. Keep keyword-based logic as fallback
7. Test end-to-end flows (automatic, manual, fallback)
8. Document setup instructions for users
