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
    console.log('Classifying ticket using keyword-based classification');
    
    // Note: Rovo Agent API integration will be added in future version
    // Currently using keyword-based classification
    
    // Simple keyword-based classification as fallback
    const summaryLower = String(input.summary || '').toLowerCase();
    const descriptionLower = String(input.description || '').toLowerCase();
    const combined = summaryLower + ' ' + descriptionLower;
    
    let category = 'Other';
    let subCategory = 'General';
    let priority: 'High' | 'Medium' | 'Low' = 'Medium';
    let urgency: 'Urgent' | 'Normal' = 'Normal';
    let confidence = 60;
    let tags: string[] = [];
    
    // Network & Connectivity
    if (combined.match(/vpn|wifi|network|connection|firewall|dns|proxy/)) {
      category = 'Network & Connectivity';
      if (combined.match(/vpn/)) subCategory = 'VPN';
      else if (combined.match(/wifi|wireless/)) subCategory = 'WiFi';
      else if (combined.match(/firewall/)) subCategory = 'Firewall';
      tags.push('network');
      confidence = 75;
    }
    // Hardware
    else if (combined.match(/laptop|desktop|pc|printer|monitor|keyboard|mouse|hardware/)) {
      category = 'Hardware';
      if (combined.match(/printer/)) subCategory = 'Printer';
      else if (combined.match(/laptop|desktop|pc/)) subCategory = 'Computer';
      else if (combined.match(/monitor|screen|display/)) subCategory = 'Monitor';
      tags.push('hardware');
      confidence = 75;
    }
    // Software
    else if (combined.match(/software|application|app|program|install|update|license/)) {
      category = 'Software';
      if (combined.match(/license/)) subCategory = 'License';
      else if (combined.match(/install/)) subCategory = 'Installation';
      tags.push('software');
      confidence = 70;
    }
    // Account & Access
    else if (combined.match(/password|login|access|permission|account|reset/)) {
      category = 'Account & Access';
      if (combined.match(/password|reset/)) subCategory = 'Password Reset';
      else if (combined.match(/permission|access/)) subCategory = 'Permissions';
      tags.push('access');
      confidence = 80;
    }
    
    // Priority determination
    if (combined.match(/urgent|critical|emergency|asap|immediately/)) {
      priority = 'High';
      urgency = 'Urgent';
      confidence += 10;
    } else if (combined.match(/minor|low|enhancement|feature request/)) {
      priority = 'Low';
      confidence += 5;
    }
    
    const result = {
      category,
      subCategory,
      priority,
      urgency,
      confidence: Math.min(confidence, 95),
      reasoning: `Classified based on keywords in summary and description. Category: ${category}, Priority: ${priority}`,
      tags
    };
    
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
  try {
    console.log('Suggesting assignee using workload-based selection');
    
    // Note: Rovo Agent API integration will be added in future version
    // Currently using workload-based selection
    
    // Fallback if no agents available
    if (input.availableAgents.length === 0) {
      return {
        assignee: 'Unassigned',
        assigneeId: '',
        reason: 'No available agents found',
        confidence: 0,
        estimatedTime: 'Unknown',
        alternatives: []
      };
    }
    
    // Simple workload-based selection
    const sortedAgents = [...input.availableAgents].sort((a, b) => a.currentLoad - b.currentLoad);
    const bestAgent = sortedAgents[0];
    const alternatives = sortedAgents.slice(1, 3).map(agent => ({
      assignee: agent.name,
      assigneeId: agent.id,
      reason: `Current workload: ${agent.currentLoad} tickets`
    }));
    
    return {
      assignee: bestAgent.name,
      assigneeId: bestAgent.id,
      reason: `Selected based on lowest current workload (${bestAgent.currentLoad} tickets)`,
      confidence: 60,
      estimatedTime: '2-4 hours',
      alternatives
    };
  } catch (error) {
    console.error('Error in suggestAssignee:', error);
    
    // Return first available agent as fallback
    const firstAgent = input.availableAgents[0];
    return {
      assignee: firstAgent.name,
      assigneeId: firstAgent.id,
      reason: 'Error occurred, assigned to first available agent',
      confidence: 30,
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
  // Mock implementation until Rovo Agent API is available
  try {
    console.log('Finding similar tickets with mock logic (Rovo Agent not yet available)');
    
    if (input.pastTickets.length === 0) {
      return {
        similarTickets: [],
        suggestedActions: ['No similar tickets found. This appears to be a new type of issue.']
      };
    }
    
    // Simple keyword matching for similarity
    const currentSummaryWords = String(input.currentTicket.summary || '').toLowerCase().split(/\s+/);
    const currentDescWords = String(input.currentTicket.description || '').toLowerCase().split(/\s+/);
    const currentWords = new Set([...currentSummaryWords, ...currentDescWords]);
    
    const scoredTickets = input.pastTickets.map(ticket => {
      const ticketSummaryWords = String(ticket.summary || '').toLowerCase().split(/\s+/);
      const ticketDescWords = String(ticket.description || '').toLowerCase().split(/\s+/);
      const ticketWords = new Set([...ticketSummaryWords, ...ticketDescWords]);
      
      // Calculate similarity based on common words
      let commonWords = 0;
      currentWords.forEach(word => {
        if (ticketWords.has(word) && word.length > 3) {
          commonWords++;
        }
      });
      
      const similarity = Math.min(commonWords / Math.max(currentWords.size, 1), 1);
      
      return {
        id: ticket.id,
        similarity,
        solution: ticket.resolution,
        resolutionTime: ticket.resolutionTime
      };
    });
    
    // Sort by similarity and take top 3
    const similarTickets = scoredTickets
      .filter(t => t.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    const suggestedActions = similarTickets.length > 0
      ? [
          `Review similar ticket ${similarTickets[0].id} for potential solutions`,
          'Check if the same resolution approach can be applied',
          'Contact the previous assignee for insights'
        ]
      : ['No similar tickets found. Treat as a new issue type.'];
    
    return {
      similarTickets,
      suggestedActions
    };
  } catch (error) {
    console.error('Error in findSimilarTickets:', error);
    return {
      similarTickets: [],
      suggestedActions: ['AI analysis failed, manual review recommended']
    };
  }
}


