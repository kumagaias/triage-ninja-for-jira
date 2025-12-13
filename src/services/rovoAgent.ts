import api from '@forge/api';

/**
 * Rovo Agent Service
 * Handles AI-powered ticket analysis using Atlassian Rovo Agent
 */

/**
 * Input interface for ticket classification
 */
export interface ClassifyTicketInput {
  summary: string;
  description: string;
  reporter: string;
  created: string;
}

/**
 * Output interface for ticket classification
 */
export interface ClassifyTicketOutput {
  category: string;
  subCategory: string;
  priority: 'High' | 'Medium' | 'Low';
  urgency: 'Urgent' | 'Normal';
  confidence: number;
  reasoning: string;
  tags: string[];
}

/**
 * Input interface for assignee suggestion
 */
export interface SuggestAssigneeInput {
  category: string;
  subCategory: string;
  availableAgents: Array<{
    name: string;
    id: string;
    skills: string[];
    currentLoad: number;
  }>;
  historicalData: Array<{
    agent: string;
    category: string;
    avgResolutionTime: string;
    successRate: number;
  }>;
}

/**
 * Output interface for assignee suggestion
 */
export interface SuggestAssigneeOutput {
  assignee: string;
  assigneeId: string;
  reason: string;
  confidence: number;
  estimatedTime: string;
  alternatives: Array<{
    assignee: string;
    assigneeId: string;
    reason: string;
  }>;
}

/**
 * Input interface for similar ticket search
 */
export interface FindSimilarInput {
  currentTicket: {
    summary: string;
    description: string;
  };
  pastTickets: Array<{
    id: string;
    summary: string;
    description: string;
    resolution: string;
    resolutionTime: string;
  }>;
}

/**
 * Output interface for similar ticket search
 */
export interface FindSimilarOutput {
  similarTickets: Array<{
    id: string;
    similarity: number;
    solution: string;
    resolutionTime: string;
  }>;
  suggestedActions: string[];
}

/**
 * Classify a ticket using AI analysis
 * Analyzes ticket content and determines category, priority, and urgency
 */
export async function classifyTicket(input: ClassifyTicketInput): Promise<ClassifyTicketOutput> {
  const prompt = `Analyze the following support ticket and determine the appropriate category, priority, and urgency.

Ticket Information:
- Summary: ${sanitizeForPrompt(input.summary)}
- Description: ${sanitizeForPrompt(input.description || 'None')}
- Reporter: ${sanitizeForPrompt(input.reporter)}
- Created: ${sanitizeForPrompt(input.created)}

Category Examples:
- Network & Connectivity (VPN, WiFi, Firewall)
- Hardware (PC, Printer, Monitor, Keyboard)
- Software (Application, OS, License)
- Account & Access (Password, Permissions, Login)
- Email & Communication (Outlook, Teams, Slack)
- Other

Priority Criteria:
- High: Critical business impact, affects many users
- Medium: Business impact but workaround available
- Low: Minor issue, enhancement request

Urgency Criteria:
- Urgent: Requires immediate attention
- Normal: Can be handled in normal workflow

Respond in the following JSON format:
{
  "category": "Category name",
  "subCategory": "Subcategory name",
  "priority": "High/Medium/Low",
  "urgency": "Urgent/Normal",
  "confidence": 0-100 numeric value,
  "reasoning": "Explanation of why this category, priority, and urgency were determined",
  "tags": ["tag1", "tag2"]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to classify ticket');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      category: result.category || 'Uncategorized',
      subCategory: result.subCategory || 'General',
      priority: result.priority || 'Medium',
      urgency: result.urgency || 'Normal',
      confidence: result.confidence || 50,
      reasoning: result.reasoning || 'AI analysis completed',
      tags: result.tags || []
    };
  } catch (error) {
    console.error('Error in classifyTicket:', error);
    
    // Return fallback result
    return {
      category: 'Uncategorized',
      subCategory: 'General',
      priority: 'Medium',
      urgency: 'Normal',
      confidence: 0,
      reasoning: 'AI analysis failed, manual triage required',
      tags: []
    };
  }
}

/**
 * Sanitize data for prompt to prevent injection attacks
 */
function sanitizeForPrompt(data: any): string {
  if (typeof data === 'string') {
    return data.replace(/[\\"`]/g, '\\$&').substring(0, 500);
  }
  return JSON.stringify(data).substring(0, 1000);
}

/**
 * Escape string for safe embedding in GraphQL query
 * Handles all special characters that could break GraphQL syntax
 */
function escapeGraphQL(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/"/g, '\\"')      // Double quote
    .replace(/\n/g, '\\n')     // Newline
    .replace(/\r/g, '\\r')     // Carriage return
    .replace(/\t/g, '\\t')     // Tab
    .replace(/\f/g, '\\f')     // Form feed
    .replace(/\b/g, '\\b')     // Backspace
    .replace(/\u0000/g, '')    // Null character (remove)
    .replace(/[\u0001-\u001F\u007F-\u009F]/g, ''); // Control characters (remove)
}

/**
 * Suggest the best assignee for a ticket
 * Analyzes agent skills and workload to recommend optimal assignment
 */
export async function suggestAssignee(input: SuggestAssigneeInput): Promise<SuggestAssigneeOutput> {
  // Format available agents in a safe, readable way
  const formattedAgents = input.availableAgents
    .map((agent, index) => 
      `${index + 1}. ${sanitizeForPrompt(agent.name)} (ID: ${sanitizeForPrompt(agent.id)})
   Current workload: ${agent.currentLoad} tickets`
    )
    .join('\n');

  // Format historical data in a safe, readable way
  const formattedHistory = input.historicalData
    .map((data, index) => 
      `${index + 1}. ${sanitizeForPrompt(data.agent)}
   Category: ${sanitizeForPrompt(data.category)}
   Avg resolution time: ${sanitizeForPrompt(data.avgResolutionTime)}
   Success rate: ${data.successRate * 100}%`
    )
    .join('\n');

  const prompt = `Based on the following information, select the best assignee for this ticket:

Category: ${sanitizeForPrompt(input.category)}
Subcategory: ${sanitizeForPrompt(input.subCategory)}

Available Assignees:
${formattedAgents}

Historical Performance:
${formattedHistory}

Respond in JSON format:
{
  "assignee": "Assignee name",
  "assigneeId": "Assignee ID",
  "reason": "Reason for selection",
  "confidence": 0-100,
  "estimatedTime": "Estimated resolution time",
  "alternatives": [
    {
      "assignee": "Alternative assignee name",
      "assigneeId": "Alternative assignee ID",
      "reason": "Reason"
    }
  ]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to suggest assignee');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      assignee: result.assignee || 'Unassigned',
      assigneeId: result.assigneeId || '',
      reason: result.reason || 'No specific reason',
      confidence: result.confidence || 50,
      estimatedTime: result.estimatedTime || 'Unknown',
      alternatives: result.alternatives || []
    };
  } catch (error) {
    console.error('Error in suggestAssignee:', error);
    
    // Return fallback result
    return {
      assignee: 'Unassigned',
      assigneeId: '',
      reason: 'AI analysis failed, manual assignment required',
      confidence: 0,
      estimatedTime: 'Unknown',
      alternatives: []
    };
  }
}

/**
 * Find similar tickets based on content analysis
 * Uses AI to identify semantically similar past tickets
 */
export async function findSimilarTickets(input: FindSimilarInput): Promise<FindSimilarOutput> {
  // Format past tickets in a more readable way for the AI with sanitization
  const formattedPastTickets = input.pastTickets
    .map((ticket, index) => 
      `${index + 1}. ${sanitizeForPrompt(ticket.id)}
   Summary: ${sanitizeForPrompt(ticket.summary)}
   Description: ${sanitizeForPrompt(ticket.description.substring(0, 200))}${ticket.description.length > 200 ? '...' : ''}
   Resolution: ${sanitizeForPrompt(ticket.resolution)}
   Resolution time: ${sanitizeForPrompt(ticket.resolutionTime)}`
    )
    .join('\n\n');

  const prompt = `Analyze the past tickets and identify the top 3 most similar tickets to the current one:

Current Ticket:
- Summary: ${sanitizeForPrompt(input.currentTicket.summary)}
- Description: ${sanitizeForPrompt(input.currentTicket.description || 'None')}

Past Tickets:
${formattedPastTickets}

Respond in JSON format:
{
  "similarTickets": [
    {
      "id": "Ticket ID",
      "similarity": 0-1 numeric value,
      "solution": "Summary of resolution",
      "resolutionTime": "Resolution time"
    }
  ],
  "suggestedActions": [
    "Suggested action 1",
    "Suggested action 2"
  ]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to find similar tickets');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      similarTickets: result.similarTickets || [],
      suggestedActions: result.suggestedActions || []
    };
  } catch (error) {
    console.error('Error in findSimilarTickets:', error);
    
    // Return fallback result
    return {
      similarTickets: [],
      suggestedActions: ['AI analysis failed, manual review recommended']
    };
  }
}
