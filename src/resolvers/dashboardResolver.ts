import Resolver from '@forge/resolver';
import { JiraClient } from '../services/jiraClient';
import * as RovoAgent from '../services/rovoAgent';
import { calculateUserWorkload } from '../utils/helpers';
import { DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT } from '../utils/constants';

/**
 * Dashboard Resolver
 * Handles all dashboard-related operations including ticket fetching,
 * statistics, test ticket creation, and AI triage
 */
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
        const currentLoad = await calculateUserWorkload(user.accountId, projectKey);
        
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
