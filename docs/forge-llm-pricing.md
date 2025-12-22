# Forge LLM (Rovo) Pricing Information

## Current Status: Early Access Program (EAP)

TriageNinja uses Forge LLM (Rovo) which is currently in **Early Access Program**.

## EAP Period (Current)

### Cost
- **FREE** - No charges during EAP period
- **Usage Limits** - Subject to Atlassian-defined limits
- **No Credit Card Required** - Free access for approved apps

### Duration
- **Start:** Upon EAP approval
- **End:** Before January 1, 2026
- **Estimated:** 6-12 months of free access

### Access Requirements
1. Register at: https://go.atlassian.com/signup-forge-llms
2. Provide app details
3. Wait for approval (24-48 hours typically)
4. Accept EAP terms

## Post-EAP Period (2026+)

### Billing Start Date
**January 1, 2026**

### Pricing Model
- **Billable Capability** - Pay-per-use model
- **Token-based** - Charged per API call/token usage
- **Specific Rates:** To be announced by Atlassian

### Expected Pricing Structure
Based on typical LLM pricing:
- Input tokens: $X per 1M tokens
- Output tokens: $Y per 1M tokens
- Minimum charge: TBD

**Note:** Actual pricing will be announced by Atlassian before EAP ends.

## Usage Estimates

### Per Triage Operation

**Typical token usage:**
- Classification prompt: ~500 tokens (input)
- Classification response: ~200 tokens (output)
- Assignee prompt: ~300 tokens (input)
- Assignee response: ~100 tokens (output)
- **Total per triage:** ~1,100 tokens

### Monthly Estimates

| Tickets/Month | Total Tokens | Estimated Cost* |
|---------------|--------------|-----------------|
| 100           | 110,000      | TBD             |
| 500           | 550,000      | TBD             |
| 1,000         | 1,100,000    | TBD             |
| 5,000         | 5,500,000    | TBD             |

*Actual costs will depend on Atlassian's pricing announcement.

## Cost Optimization Strategies

### 1. Reduce Token Usage

**Optimize prompts:**
```typescript
// ❌ Verbose prompt (more tokens)
const prompt = `You are an expert assistant. Please analyze this ticket carefully and provide detailed classification...`;

// ✅ Concise prompt (fewer tokens)
const prompt = `Classify this ticket. Return JSON: {category, priority, confidence}`;
```

### 2. Implement Caching

Cache common classifications:
```typescript
const cache = new Map();
const cacheKey = `${summary}-${description}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await classifyTicketWithLLM(...);
cache.set(cacheKey, result);
```

### 3. Batch Processing

Process multiple tickets in one API call (if supported):
```typescript
// Instead of 10 separate calls
// Make 1 call with 10 tickets
```

### 4. Selective AI Usage

Use AI only for complex tickets:
```typescript
if (isSimpleTicket(summary)) {
  return keywordBasedClassification(summary);
} else {
  return await classifyTicketWithLLM(ticketData);
}
```

### 5. Adjust Model Settings

Lower token limits:
```typescript
const response = await chat({
  model: 'claude-3-5-haiku-20241022',
  max_completion_tokens: 300, // Reduced from 500
  temperature: 0.3
});
```

## Monitoring Usage

### Track Token Consumption

```typescript
let totalTokens = 0;

const response = await chat({...});

if (response.usage) {
  totalTokens += response.usage.total_tokens;
  console.log('Total tokens used:', totalTokens);
}
```

### Set Usage Alerts

```typescript
const MONTHLY_TOKEN_LIMIT = 1000000; // 1M tokens

if (totalTokens > MONTHLY_TOKEN_LIMIT) {
  console.warn('Monthly token limit exceeded!');
  // Switch to keyword-based fallback
}
```

## Fallback Strategy

To control costs, TriageNinja implements automatic fallback:

```typescript
try {
  // Try Forge LLM (costs tokens)
  return await classifyTicketWithLLM(ticketData);
} catch (error) {
  // Fallback to keyword-based (free)
  return await keywordBasedClassification(ticketData);
}
```

## EAP Terms Summary

### What You Agree To

1. **Testing Purpose Only**
   - Use for internal testing and development
   - Not guaranteed for production workloads

2. **Data Processing**
   - AWS Bedrock processes your data
   - Atlassian applies moderation filters
   - End user queries submitted to LLM

3. **Acceptable Use Policy**
   - Comply with Atlassian AUP
   - Follow AI-specific requirements
   - No malicious or harmful use

4. **App Review**
   - Atlassian may review your app
   - Can suspend app or LLM access
   - No liability for suspension

5. **Usage Limits**
   - Subject to Atlassian-defined limits
   - Limits may change without notice
   - Exceeding limits may result in throttling

### What Atlassian Provides

1. **Free Access** - During EAP period
2. **Claude AI Model** - Via AWS Bedrock
3. **Safety Filters** - Moderation and safeguards
4. **Support** - EAP participant support

### What Happens After EAP

1. **Billing Starts** - January 1, 2026
2. **Pricing Announced** - Before EAP ends
3. **Opt-in Required** - Choose to continue or not
4. **Migration Period** - Time to adjust or migrate

## Planning for Post-EAP

### Option 1: Continue with Forge LLM
- Pay per usage
- Maintain AI-powered features
- Monitor and optimize costs

### Option 2: Switch to Keyword-Based
- Free (no LLM costs)
- Reduced accuracy
- Simpler implementation

### Option 3: Hybrid Approach
- Use LLM for complex tickets
- Use keywords for simple tickets
- Balance cost and accuracy

## Recommendations

### For Hackathon/Demo
✅ **Use Forge LLM** - Free during EAP, impressive AI features

### For Production (Post-EAP)
⚠️ **Evaluate costs** - Wait for pricing announcement
✅ **Implement monitoring** - Track token usage
✅ **Optimize prompts** - Reduce token consumption
✅ **Keep fallback** - Keyword-based as backup

## Questions?

- **EAP Registration:** https://go.atlassian.com/signup-forge-llms
- **Developer Terms:** https://www.atlassian.com/legal/atlassian-developer-terms
- **Support:** Atlassian Developer Community

## Related Documents

- `docs/forge-llm-rovo-integration.md` - Technical integration guide
- `docs/deployment-guide.md` - Deployment instructions
- `src/services/forgeLlmTriage.ts` - Implementation code
