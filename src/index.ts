import Resolver from '@forge/resolver';
import { JiraClient } from './services/jiraClient';
import * as RovoAgent from './services/rovoAgent';

// Constants for search configuration
const MIN_KEYWORD_LENGTH = 3;
const MAX_SEARCH_KEYWORDS = 5;
const MAX_RESULTS_LIMIT = 100;
const DEFAULT_MAX_RESULTS = 50;

// Dashboard Resolver
const dashboardResolver = new Resolver();

/**
 * Fetch tickets for the dashboard with optional filter
 * Returns a list of tickets based on the filter parameter
 * @param filter - 'all' (default) or 'untriaged' (no assignee)
 */
dashboardResolver.define('getTickets', async (req) => {
  const projectKey = req.context.extension.project.key;
  const payload = req.payload as { filter?: string };
  const filter = payload?.filter || 'all';
  
  // Build JQL query based on filter
  let jql: string;
  if (filter === 'untriaged') {
    // Untriaged tickets: no assignee and not in Done status
    // Using statusCategory for better compatibility across different Jira configurations
    jql = `project = ${projectKey} AND assignee is EMPTY AND statusCategory != Done ORDER BY created DESC`;
  } else {
    // All tickets: all tickets not in Done status, regardless of assignee
    jql = `project = ${projectKey} AND statusCategory != Done ORDER BY created DESC`;
  }
  
  const response = await JiraClient.searchIssues({
    jql,
    maxResults: 100,
    fields: ['summary', 'priority', 'created', 'reporter', 'assignee', 'status']
  });
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch tickets:', response.error);
    return [];
  }
  
  return response.data.issues || [];
});

/**
 * Get dashboard statistics
 * Returns metrics for the dashboard cards
 */
dashboardResolver.define('getStatistics', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  try {
    // Get untriaged tickets count (no assignee and not in Done/Closed status)
    // Using status category instead of specific status name for better compatibility
    const untriagedJql = `project = ${projectKey} AND assignee is EMPTY AND statusCategory != Done`;
    console.log('[getStatistics] Untriaged JQL:', untriagedJql);
    
    const untriagedResponse = await JiraClient.searchIssues({
      jql: untriagedJql,
      maxResults: 100, // Get up to 100 tickets to count
      fields: ['key'] // Only need the key field
    });
    
    const untriagedCount = untriagedResponse.ok && untriagedResponse.data?.issues 
      ? untriagedResponse.data.issues.length 
      : 0;
    
    console.log('[getStatistics] Untriaged response:', {
      ok: untriagedResponse.ok,
      count: untriagedCount,
      issuesLength: untriagedResponse.data?.issues?.length,
      error: untriagedResponse.error
    });
    
    // Get today's processed tickets (assigned today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const todayProcessedResponse = await JiraClient.searchIssues({
      jql: `project = ${projectKey} AND assignee is not EMPTY AND updated >= "${todayStr}"`,
      maxResults: 100, // Get up to 100 tickets to count
      fields: ['key'] // Only need the key field
    });
    
    const todayProcessedCount = todayProcessedResponse.ok && todayProcessedResponse.data?.issues
      ? todayProcessedResponse.data.issues.length
      : 0;
    
    const result = {
      untriagedCount,
      todayProcessed: todayProcessedCount,
      timeSaved: 78, // Mock data - will be calculated based on historical data
      aiAccuracy: 94  // Mock data - will be calculated based on feedback
    };
    
    console.log('[getStatistics] Result:', result);
    return result;
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    // Return zeros on error
    return {
      untriagedCount: 0,
      todayProcessed: 0,
      timeSaved: 0,
      aiAccuracy: 0
    };
  }
});

/**
 * Create test tickets for demo purposes
 * Creates sample tickets with various priorities and categories
 */
dashboardResolver.define('createTestTickets', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  // Test ticket templates
  const testTickets = [
    {
      summary: 'Cannot connect to VPN from home',
      description: 'I\'m trying to connect to the company VPN from my home office, but I keep getting an "Authentication failed" error. This is urgent as I need to access internal systems.'
    },
    {
      summary: 'Office printer not printing color documents',
      description: 'The printer on the 3rd floor is only printing in black and white, even when I select color printing in the settings.'
    },
    {
      summary: 'Need to reset my email password',
      description: 'I forgot my email password and can\'t log in to Outlook. I\'ve tried the self-service password reset, but I\'m not receiving the verification code.'
    }
  ];
  
  try {
    const createdTickets = [];
    
    for (const ticket of testTickets) {
      // Create issue with minimal required fields
      // Priority is optional and will use project default
      const response = await JiraClient.createIssue({
        fields: {
          project: { key: projectKey },
          summary: ticket.summary,
          description: ticket.description,
          issuetype: { name: 'Task' }
        }
      });
      
      if (response.ok && response.data) {
        createdTickets.push(response.data.key);
      } else {
        console.error('Failed to create ticket:', response.error);
      }
    }
    
    return {
      success: true,
      count: createdTickets.length,
      tickets: createdTickets
    };
  } catch (error) {
    console.error('Error creating test tickets:', error);
    throw new Error(`Failed to create test tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Search tickets with pagination support
 * Allows filtering and pagination for dashboard ticket list
 */
dashboardResolver.define('searchTickets', async (req) => {
  const payload = req.payload as { jql?: string; startAt?: number; maxResults?: number };
  const { jql, startAt: rawStartAt = 0, maxResults: rawMaxResults = DEFAULT_MAX_RESULTS } = payload;
  const projectKey = req.context.extension.project.key;
  
  // Validate startAt to ensure it is a non-negative integer
  const startAt = (typeof rawStartAt === 'number' && Number.isInteger(rawStartAt) && rawStartAt >= 0) ? rawStartAt : 0;
  
  // Validate maxResults and cap at MAX_RESULTS_LIMIT
  const maxResults = (typeof rawMaxResults === 'number' && Number.isInteger(rawMaxResults) && rawMaxResults > 0) 
    ? Math.min(rawMaxResults, MAX_RESULTS_LIMIT) 
    : DEFAULT_MAX_RESULTS;
  
  // Use provided JQL or default to untriaged tickets
  // Note: projectKey comes from Forge context and is trusted
  const searchJql = jql || `project = ${projectKey} AND status = Open ORDER BY created DESC`;
  
  const response = await JiraClient.searchIssues({
    jql: searchJql,
    startAt,
    maxResults,
    fields: ['summary', 'priority', 'status', 'created', 'reporter', 'assignee']
  });
  
  if (!response.ok || !response.data) {
    console.error('Failed to search tickets:', response.error);
    return {
      issues: [],
      total: 0,
      startAt: 0,
      maxResults
    };
  }
  
  return response.data;
});

/**
 * Trigger AI triage analysis (Dashboard)
 * Uses Rovo Agent to classify ticket, suggest assignee, and find similar tickets
 */
dashboardResolver.define('runAITriage', async (req) => {
  const payload = req.payload as { 
    issueKey: string;
    summary: string;
    description: string;
    reporter: string;
    created: string;
  };
  
  const { issueKey, summary, description, reporter, created } = payload;
  
  if (!issueKey || !summary) {
    throw new Error('Missing required parameters: issueKey or summary');
  }
  
  try {
    // Step 1: Classify the ticket
    const classification = await RovoAgent.classifyTicket({
      summary,
      description: description || '',
      reporter: reporter || 'Unknown',
      created: created || new Date().toISOString()
    });
    
    // Step 2: Get assignable users for the project
    if (!req.context || !req.context.extension || !req.context.extension.project || !req.context.extension.project.key) {
      throw new Error('Project key is missing from request context. Cannot proceed with AI triage.');
    }
    const projectKey = req.context.extension.project.key;
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
    // Calculate current workload for each user
    const availableAgents = [];
    if (usersResponse.ok && usersResponse.data) {
      for (const user of usersResponse.data) {
        // Get current open tickets assigned to this user
        const workloadResponse = await JiraClient.searchIssues({
          jql: `project = ${projectKey} AND assignee = "${user.accountId}" AND statusCategory != Done`,
          maxResults: 100,
          fields: ['key']
        });
        
        const currentLoad = workloadResponse.ok && workloadResponse.data?.issues 
          ? workloadResponse.data.issues.length 
          : 0;
        
        availableAgents.push({
          name: user.displayName,
          id: user.accountId,
          skills: [],
          currentLoad
        });
      }
    }
    
    // Step 3 & 4: Run assignee suggestion and similar ticket search in parallel
    const [assigneeSuggestion, similarAnalysis] = await Promise.all([
      RovoAgent.suggestAssignee({
        category: classification.category,
        subCategory: classification.subCategory,
        availableAgents,
        historicalData: []
      }),
      (async () => {
        const similarTicketsResponse = await JiraClient.searchIssues({
          jql: `project = ${projectKey} AND status = Resolved ORDER BY created DESC`,
          maxResults: 10,
          fields: ['summary', 'description', 'resolution', 'resolutiondate', 'created']
        });
        
        const pastTickets = similarTicketsResponse.ok && similarTicketsResponse.data ? 
          similarTicketsResponse.data.issues.map(issue => ({
            id: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description || '',
            resolution: issue.fields.resolution?.name || 'Resolved',
            resolutionTime: issue.fields.resolutiondate || issue.fields.created
          })) : [];
        
        return RovoAgent.findSimilarTickets({
          currentTicket: {
            summary,
            description: description || ''
          },
          pastTickets
        });
      })()
    ]);
    
    return {
      category: classification.category,
      subCategory: classification.subCategory,
      priority: classification.priority,
      urgency: classification.urgency,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      tags: classification.tags,
      suggestedAssignee: {
        name: assigneeSuggestion.assignee,
        id: assigneeSuggestion.assigneeId,
        reason: assigneeSuggestion.reason,
        estimatedTime: assigneeSuggestion.estimatedTime,
        confidence: assigneeSuggestion.confidence,
        alternatives: assigneeSuggestion.alternatives
      },
      similarTickets: similarAnalysis.similarTickets,
      suggestedActions: similarAnalysis.suggestedActions
    };
  } catch (error) {
    console.error('Error in runAITriage:', error);
    throw new Error('AI triage analysis failed. Please try again.');
  }
});

/**
 * Apply AI triage results to the issue (Dashboard)
 * Updates priority, assignee, and labels based on AI analysis
 */
dashboardResolver.define('applyTriageResult', async (req) => {
  const payload = req.payload as {
    issueKey: string;
    priority: string;
    assigneeId: string;
    category: string;
    subCategory: string;
  };
  
  const { issueKey, priority, assigneeId, category, subCategory } = payload;
  
  if (!issueKey) {
    throw new Error('Missing required parameter: issueKey');
  }
  
  try {
    const updateFields: any = {};
    
    if (priority) {
      const priorityMap: Record<string, string> = {
        'High': '2',
        'Medium': '3',
        'Low': '4'
      };
      
      if (priorityMap[priority]) {
        updateFields.priority = { id: priorityMap[priority] };
      }
    }
    
    if (assigneeId) {
      updateFields.assignee = { id: assigneeId };
    }
    
    const labels: string[] = [];
    if (category && category !== 'Uncategorized') {
      labels.push(`ai-category:${category.toLowerCase().replace(/\s+/g, '-')}`);
    }
    if (subCategory && subCategory !== 'General') {
      labels.push(`ai-subcategory:${subCategory.toLowerCase().replace(/\s+/g, '-')}`);
    }
    
    if (labels.length > 0) {
      updateFields.labels = labels;
    }
    
    const updateResponse = await JiraClient.updateIssue(issueKey, updateFields);
    
    if (!updateResponse.ok) {
      throw new Error('Failed to update issue');
    }
    
    return {
      success: true,
      message: 'Triage result applied successfully'
    };
  } catch (error) {
    console.error('Error in applyTriageResult:', error);
    throw new Error('Failed to apply triage result. Please try again.');
  }
});

export const dashboardHandler = dashboardResolver.getDefinitions();

// Issue Panel Resolver
const issuePanelResolver = new Resolver();

/**
 * Get issue details for AI triage
 * Fetches the current issue information including custom fields
 */
issuePanelResolver.define('getIssueDetails', async (req) => {
  const issueKey = req.context.extension.issue.key;
  
  // Fetch issue with all fields including custom fields
  const response = await JiraClient.getIssue(issueKey);
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch issue details:', response.error);
    throw new Error('Failed to load issue details');
  }
  
  const data = response.data;
  
  // Return comprehensive issue data including custom fields
  return {
    key: data.key,
    id: data.id,
    summary: data.fields.summary,
    description: data.fields.description ?? null,
    reporter: data.fields.reporter ?? null,
    assignee: data.fields.assignee ?? null,
    created: data.fields.created,
    updated: data.fields.updated,
    priority: data.fields.priority ?? null,
    status: data.fields.status ?? null,
    issueType: data.fields.issuetype ?? null,
    labels: data.fields.labels ?? [],
    // Custom fields are accessible via fields object
    customFields: Object.keys(data.fields)
      .filter(key => key.startsWith('customfield_'))
      .reduce((acc, key) => {
        acc[key] = data.fields[key];
        return acc;
      }, {} as Record<string, any>)
  };
});

/**
 * Get assignable users for the current project
 * Returns a list of users who can be assigned to issues
 */
issuePanelResolver.define('getAssignableUsers', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  const response = await JiraClient.getAssignableUsers(projectKey, 50);
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch assignable users:', response.error);
    return [];
  }
  
  return response.data;
});

/**
 * Escape special characters in JQL text search
 * Prevents JQL injection by escaping quotes and backslashes
 */
function escapeJqlText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Search for similar tickets using JQL
 * Helps find related issues for better triage decisions
 */
issuePanelResolver.define('searchSimilarTickets', async (req) => {
  const payload = req.payload as { summary?: string; projectKey?: string };
  const { summary, projectKey } = payload;
  
  if (!summary || !projectKey) {
    console.error('Missing required parameters: summary or projectKey');
    throw new Error('Missing required parameters: summary or projectKey');
  }
  
  // Extract keywords from summary for search
  const keywords = (summary as string)
    .split(' ')
    .filter((word: string) => word.length > MIN_KEYWORD_LENGTH)
    .slice(0, MAX_SEARCH_KEYWORDS)
    .map(word => escapeJqlText(word))
    .join(' ');
  
  // If no valid keywords, return empty result to avoid invalid JQL
  if (!keywords) {
    console.warn('No valid keywords extracted from summary for similar ticket search.');
    return [];
  }
  
  // Build JQL query to find similar tickets
  // Note: projectKey comes from payload but is used in a safe context
  const jql = `project = ${projectKey} AND text ~ "${keywords}" ORDER BY created DESC`;
  
  const response = await JiraClient.searchIssues({
    jql,
    maxResults: 10,
    fields: ['summary', 'status', 'priority', 'assignee', 'created']
  });
  
  if (!response.ok || !response.data) {
    console.error('Failed to search similar tickets:', response.error);
    return [];
  }
  
  return response.data.issues || [];
});

/**
 * Trigger AI triage analysis
 * Uses Rovo Agent to classify ticket, suggest assignee, and find similar tickets
 */
issuePanelResolver.define('runAITriage', async (req) => {
  const payload = req.payload as { 
    issueKey: string;
    summary: string;
    description: string;
    reporter: string;
    created: string;
  };
  
  const { issueKey, summary, description, reporter, created } = payload;
  
  if (!issueKey || !summary) {
    throw new Error('Missing required parameters: issueKey or summary');
  }
  
  try {
    // Step 1: Classify the ticket
    const classification = await RovoAgent.classifyTicket({
      summary,
      description: description || '',
      reporter: reporter || 'Unknown',
      created: created || new Date().toISOString()
    });
    
    // Step 2: Get assignable users for the project
    if (!req.context || !req.context.extension || !req.context.extension.project || !req.context.extension.project.key) {
      throw new Error('Project key is missing from request context. Cannot proceed with AI triage.');
    }
    const projectKey = req.context.extension.project.key;
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
    // Calculate current workload for each user
    const availableAgents = [];
    if (usersResponse.ok && usersResponse.data) {
      for (const user of usersResponse.data) {
        // Get current open tickets assigned to this user
        const workloadResponse = await JiraClient.searchIssues({
          jql: `project = ${projectKey} AND assignee = "${user.accountId}" AND statusCategory != Done`,
          maxResults: 100,
          fields: ['key']
        });
        
        const currentLoad = workloadResponse.ok && workloadResponse.data?.issues 
          ? workloadResponse.data.issues.length 
          : 0;
        
        availableAgents.push({
          name: user.displayName,
          id: user.accountId,
          skills: [], // Will be populated from historical data in future
          currentLoad
        });
      }
    }
    
    // Step 3 & 4: Run assignee suggestion and similar ticket search in parallel
    const [assigneeSuggestion, similarAnalysis] = await Promise.all([
      // Suggest assignee based on classification
      RovoAgent.suggestAssignee({
        category: classification.category,
        subCategory: classification.subCategory,
        availableAgents,
        historicalData: [] // Will be populated from Forge Storage in future
      }),
      // Search for similar tickets and analyze with AI
      (async () => {
        const similarTicketsResponse = await JiraClient.searchIssues({
          jql: `project = ${projectKey} AND status = Resolved ORDER BY created DESC`,
          maxResults: 10,
          fields: ['summary', 'description', 'resolution', 'resolutiondate', 'created']
        });
        
        const pastTickets = similarTicketsResponse.ok && similarTicketsResponse.data ? 
          similarTicketsResponse.data.issues.map(issue => ({
            id: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description || '',
            resolution: issue.fields.resolution?.name || 'Resolved',
            resolutionTime: issue.fields.resolutiondate || issue.fields.created
          })) : [];
        
        return RovoAgent.findSimilarTickets({
          currentTicket: {
            summary,
            description: description || ''
          },
          pastTickets
        });
      })()
    ]);
    
    // Combine all results
    return {
      category: classification.category,
      subCategory: classification.subCategory,
      priority: classification.priority,
      urgency: classification.urgency,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      tags: classification.tags,
      suggestedAssignee: {
        name: assigneeSuggestion.assignee,
        id: assigneeSuggestion.assigneeId,
        reason: assigneeSuggestion.reason,
        estimatedTime: assigneeSuggestion.estimatedTime,
        confidence: assigneeSuggestion.confidence,
        alternatives: assigneeSuggestion.alternatives
      },
      similarTickets: similarAnalysis.similarTickets,
      suggestedActions: similarAnalysis.suggestedActions
    };
  } catch (error) {
    console.error('Error in runAITriage:', error);
    
    // Provide more specific error messages based on error type
    if (error && typeof error === 'object') {
      const err = error as any;
      
      // Network or fetch error
      if (err.name === 'FetchError' || err.message?.includes('network') || err.message?.includes('Network')) {
        throw new Error('AI triage analysis failed due to a network error. Please check your connection and try again.');
      }
      
      // Timeout error
      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        throw new Error('AI triage analysis timed out. Please try again later.');
      }
      
      // Service unavailable
      if (err.message?.includes('service unavailable') || err.message?.includes('Service Unavailable')) {
        throw new Error('AI triage analysis failed because the AI service is unavailable. Please try again later.');
      }
      
      // JSON parsing error
      if (err.message?.includes('not valid JSON')) {
        throw new Error('AI triage analysis returned an invalid response. Please try again.');
      }
      
      // Project context error
      if (err.message?.includes('Project key is missing')) {
        throw new Error('Unable to access project information. Please refresh the page and try again.');
      }
      
      // Generic error with error type
      const errorType = err.name || 'UnknownError';
      throw new Error(`AI triage analysis failed (${errorType}). Please try again.`);
    }
    
    throw new Error('AI triage analysis failed due to an unknown error. Please try again.');
  }
});

/**
 * Apply AI triage results to the issue
 * Updates priority, assignee, and labels based on AI analysis
 */
issuePanelResolver.define('applyTriageResult', async (req) => {
  const payload = req.payload as {
    issueKey: string;
    priority: string;
    assigneeId: string;
    category: string;
    subCategory: string;
  };
  
  const { issueKey, priority, assigneeId, category, subCategory } = payload;
  
  if (!issueKey) {
    throw new Error('Missing required parameter: issueKey');
  }
  
  try {
    // Prepare update fields
    const updateFields: any = {};
    
    // Update priority if provided
    if (priority) {
      // Map our priority to Jira priority IDs
      // Note: Priority IDs may vary by Jira instance
      const priorityMap: Record<string, string> = {
        'High': '2',      // High
        'Medium': '3',    // Medium
        'Low': '4'        // Low
      };
      
      if (priorityMap[priority]) {
        updateFields.priority = { id: priorityMap[priority] };
      }
    }
    
    // Update assignee if provided
    if (assigneeId) {
      updateFields.assignee = { id: assigneeId };
    }
    
    // Add category labels
    const labels: string[] = [];
    if (category && category !== 'Uncategorized') {
      labels.push(`ai-category:${category.toLowerCase().replace(/\s+/g, '-')}`);
    }
    if (subCategory && subCategory !== 'General') {
      labels.push(`ai-subcategory:${subCategory.toLowerCase().replace(/\s+/g, '-')}`);
    }
    
    if (labels.length > 0) {
      updateFields.labels = labels;
    }
    
    // Update the issue
    const updateResponse = await JiraClient.updateIssue(issueKey, updateFields);
    
    if (!updateResponse.ok) {
      throw new Error('Failed to update issue');
    }
    
    return {
      success: true,
      message: 'Triage result applied successfully'
    };
  } catch (error) {
    console.error('Error in applyTriageResult:', error);
    throw new Error('Failed to apply triage result. Please try again.');
  }
});

export const issuePanelHandler = issuePanelResolver.getDefinitions();

// ============================================================================
// Rovo Actions
// ============================================================================

/**
 * Rovo Action: Analyze Ticket Classification
 * Fetches ticket data and returns structured information for Rovo Agent to analyze
 * 
 * This action is invoked by Rovo Agent through Jira Automation rules.
 * It provides the AI with ticket details to determine category, priority, and urgency.
 * 
 * @param payload - Contains issueKey
 * @param context - Forge context with user information
 * @returns Structured ticket data for AI analysis
 */
export async function analyzeTicketClassification(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = payload;
  
  // Log action invocation (sanitized)
  console.log('[analyzeTicketClassification] Action invoked', {
    timestamp,
    issueKey,
    accountId: context?.accountId || 'unknown'
  });
  
  try {
    // Validate input
    if (!issueKey || typeof issueKey !== 'string') {
      const error = 'Invalid input: issueKey is required and must be a string';
      console.error('[analyzeTicketClassification] Validation error:', {
        timestamp,
        error,
        receivedIssueKey: issueKey
      });
      throw new Error(error);
    }
    
    // Fetch ticket data from Jira API
    const response = await JiraClient.getIssue(issueKey);
    
    if (!response.ok || !response.data) {
      const error = `Failed to fetch ticket data: ${response.error || 'Unknown error'}`;
      console.error('[analyzeTicketClassification] Jira API error:', {
        timestamp,
        issueKey,
        error: response.error,
        statusCode: response.status
      });
      throw new Error(error);
    }
    
    const ticket = response.data;
    
    // Extract and structure ticket data for Rovo Agent
    const result = {
      issueKey: ticket.key,
      summary: ticket.fields.summary || '',
      description: ticket.fields.description || '',
      reporter: ticket.fields.reporter?.displayName || 'Unknown',
      reporterEmail: ticket.fields.reporter?.emailAddress || '',
      created: ticket.fields.created || timestamp,
      currentPriority: ticket.fields.priority?.name || 'None',
      currentStatus: ticket.fields.status?.name || 'Unknown',
      labels: ticket.fields.labels || [],
      // Provide context for AI analysis
      context: {
        hasDescription: Boolean(ticket.fields.description),
        descriptionLength: (ticket.fields.description || '').length,
        summaryLength: ticket.fields.summary?.length || 0,
        age: ticket.fields.created ? 
          Math.floor((Date.now() - new Date(ticket.fields.created).getTime()) / (1000 * 60 * 60)) : 0 // hours
      }
    };
    
    // Log successful response
    console.log('[analyzeTicketClassification] Success', {
      timestamp,
      issueKey,
      summary: result.summary.substring(0, 50) + '...',
      hasDescription: result.context.hasDescription,
      descriptionLength: result.context.descriptionLength
    });
    
    return result;
    
  } catch (error) {
    // Log error with full context
    console.error('[analyzeTicketClassification] Error:', {
      timestamp,
      issueKey,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error message for Rovo Agent to handle
    throw new Error(
      `Failed to analyze ticket classification for ${issueKey}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Rovo Action: Suggest Ticket Assignee
 * Fetches available agents with their current workload and returns data for Rovo Agent
 * 
 * This action is invoked by Rovo Agent through Jira Automation rules.
 * It provides the AI with agent information to suggest the best assignee.
 * 
 * @param payload - Contains issueKey and category
 * @param context - Forge context with user information
 * @returns Structured agent data with workload for AI analysis
 */
export async function suggestTicketAssignee(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey, category } = payload;
  
  // Log action invocation (sanitized)
  console.log('[suggestTicketAssignee] Action invoked', {
    timestamp,
    issueKey,
    category,
    accountId: context?.accountId || 'unknown'
  });
  
  try {
    // Validate inputs
    if (!issueKey || typeof issueKey !== 'string') {
      const error = 'Invalid input: issueKey is required and must be a string';
      console.error('[suggestTicketAssignee] Validation error:', {
        timestamp,
        error,
        receivedIssueKey: issueKey
      });
      throw new Error(error);
    }
    
    if (!category || typeof category !== 'string') {
      const error = 'Invalid input: category is required and must be a string';
      console.error('[suggestTicketAssignee] Validation error:', {
        timestamp,
        error,
        receivedCategory: category
      });
      throw new Error(error);
    }
    
    // Get project key from issue
    const issueResponse = await JiraClient.getIssue(issueKey);
    if (!issueResponse.ok || !issueResponse.data) {
      const error = `Failed to fetch issue: ${issueResponse.error || 'Unknown error'}`;
      console.error('[suggestTicketAssignee] Issue fetch error:', {
        timestamp,
        issueKey,
        error: issueResponse.error
      });
      throw new Error(error);
    }
    
    const projectKey = issueResponse.data.fields.project.key;
    
    // Fetch available agents from Jira
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
    if (!usersResponse.ok || !usersResponse.data) {
      const error = `Failed to fetch assignable users: ${usersResponse.error || 'Unknown error'}`;
      console.error('[suggestTicketAssignee] Users fetch error:', {
        timestamp,
        projectKey,
        error: usersResponse.error
      });
      throw new Error(error);
    }
    
    // Calculate workload for each agent
    const availableAgents = [];
    for (const user of usersResponse.data) {
      // Count open tickets assigned to this user
      const workloadResponse = await JiraClient.searchIssues({
        jql: `project = ${projectKey} AND assignee = "${user.accountId}" AND statusCategory != Done`,
        maxResults: 100,
        fields: ['key']
      });
      
      const currentLoad = workloadResponse.ok && workloadResponse.data?.issues 
        ? workloadResponse.data.issues.length 
        : 0;
      
      availableAgents.push({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || '',
        currentLoad,
        // Skills will be inferred by Rovo Agent based on historical data
        active: user.active !== false
      });
    }
    
    // Sort by workload (lowest first) for recommendation
    availableAgents.sort((a, b) => a.currentLoad - b.currentLoad);
    
    // Prepare result
    const result = {
      issueKey,
      category,
      projectKey,
      availableAgents,
      totalAgents: availableAgents.length,
      // Provide basic recommendation (Rovo Agent will refine this)
      recommendation: availableAgents.length > 0 ? {
        accountId: availableAgents[0].accountId,
        displayName: availableAgents[0].displayName,
        currentLoad: availableAgents[0].currentLoad,
        reasoning: `Lowest workload (${availableAgents[0].currentLoad} open tickets)`
      } : null
    };
    
    // Log successful response
    console.log('[suggestTicketAssignee] Success', {
      timestamp,
      issueKey,
      category,
      totalAgents: result.totalAgents,
      recommendedAgent: result.recommendation?.displayName || 'None'
    });
    
    return result;
    
  } catch (error) {
    // Log error with full context
    console.error('[suggestTicketAssignee] Error:', {
      timestamp,
      issueKey,
      category,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error message for Rovo Agent to handle
    throw new Error(
      `Failed to suggest assignee for ${issueKey}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Rovo Action: Find Similar Tickets
 * Searches for similar resolved tickets to help with resolution
 * 
 * This action is invoked by Rovo Agent through Jira Automation rules.
 * It provides the AI with similar past tickets and their solutions.
 * 
 * @param payload - Contains issueKey
 * @param context - Forge context with user information
 * @returns Similar tickets with resolution information
 */
export async function findSimilarTickets(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = payload;
  
  // Log action invocation (sanitized)
  console.log('[findSimilarTickets] Action invoked', {
    timestamp,
    issueKey,
    accountId: context?.accountId || 'unknown'
  });
  
  try {
    // Validate input
    if (!issueKey || typeof issueKey !== 'string') {
      const error = 'Invalid input: issueKey is required and must be a string';
      console.error('[findSimilarTickets] Validation error:', {
        timestamp,
        error,
        receivedIssueKey: issueKey
      });
      throw new Error(error);
    }
    
    // Fetch current ticket data
    const currentTicketResponse = await JiraClient.getIssue(issueKey);
    if (!currentTicketResponse.ok || !currentTicketResponse.data) {
      const error = `Failed to fetch current ticket: ${currentTicketResponse.error || 'Unknown error'}`;
      console.error('[findSimilarTickets] Current ticket fetch error:', {
        timestamp,
        issueKey,
        error: currentTicketResponse.error
      });
      throw new Error(error);
    }
    
    const currentTicket = currentTicketResponse.data;
    const projectKey = currentTicket.fields.project.key;
    const summary = currentTicket.fields.summary || '';
    const description = currentTicket.fields.description || '';
    
    // Extract keywords from summary for similarity search
    const keywords = summary
      .split(' ')
      .filter((word: string) => word.length > 3)
      .slice(0, 5)
      .map(word => word.replace(/[\\\"]/g, '\\$&')) // Escape special chars
      .join(' ');
    
    // Search for resolved tickets with similar keywords
    let similarTickets = [];
    if (keywords) {
      const searchResponse = await JiraClient.searchIssues({
        jql: `project = ${projectKey} AND statusCategory = Done AND text ~ "${keywords}" ORDER BY resolutiondate DESC`,
        maxResults: 10,
        fields: ['summary', 'description', 'resolution', 'resolutiondate', 'created', 'assignee', 'status']
      });
      
      if (searchResponse.ok && searchResponse.data?.issues) {
        similarTickets = searchResponse.data.issues.map(issue => {
          // Calculate simple similarity score based on keyword matches
          const issueSummary = issue.fields.summary?.toLowerCase() || '';
          const issueDescription = issue.fields.description?.toLowerCase() || '';
          const searchTerms = keywords.toLowerCase().split(' ');
          
          let matchCount = 0;
          for (const term of searchTerms) {
            if (issueSummary.includes(term) || issueDescription.includes(term)) {
              matchCount++;
            }
          }
          
          const similarityScore = Math.round((matchCount / searchTerms.length) * 100);
          
          return {
            key: issue.key,
            summary: issue.fields.summary || '',
            description: (issue.fields.description || '').substring(0, 200), // Truncate for brevity
            resolution: issue.fields.resolution?.name || 'Resolved',
            resolutionDate: issue.fields.resolutiondate || issue.fields.created,
            assignee: issue.fields.assignee?.displayName || 'Unknown',
            status: issue.fields.status?.name || 'Done',
            similarityScore
          };
        });
        
        // Sort by similarity score (highest first)
        similarTickets.sort((a, b) => b.similarityScore - a.similarityScore);
        
        // Take top 3
        similarTickets = similarTickets.slice(0, 3);
      }
    }
    
    // Prepare result
    const result = {
      issueKey,
      currentTicket: {
        summary,
        description: description.substring(0, 200), // Truncate for brevity
        projectKey
      },
      similarTickets,
      totalFound: similarTickets.length,
      searchKeywords: keywords
    };
    
    // Log successful response
    console.log('[findSimilarTickets] Success', {
      timestamp,
      issueKey,
      totalFound: result.totalFound,
      searchKeywords: keywords
    });
    
    return result;
    
  } catch (error) {
    // Log error with full context
    console.error('[findSimilarTickets] Error:', {
      timestamp,
      issueKey,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error message for Rovo Agent to handle
    throw new Error(
      `Failed to find similar tickets for ${issueKey}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
