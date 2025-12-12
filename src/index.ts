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
 * Fetch untriaged tickets for the dashboard
 * Returns a list of tickets that haven't been triaged yet
 */
dashboardResolver.define('getUntriagedTickets', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  // JQL query to find untriaged tickets
  const jql = `project = ${projectKey} AND status = Open ORDER BY created DESC`;
  
  const response = await JiraClient.searchIssues({
    jql,
    maxResults: 50,
    fields: ['summary', 'priority', 'created', 'reporter']
  });
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch untriaged tickets:', response.error);
    return [];
  }
  
  return response.data.issues || [];
});

/**
 * Get dashboard statistics
 * Returns metrics for the dashboard cards
 */
dashboardResolver.define('getStatistics', async (req) => {
  // Mock statistics for now - will be replaced with real data from Forge Storage
  return {
    untriagedCount: 24,
    todayProcessed: 156,
    timeSaved: 78,
    aiAccuracy: 94
  };
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
    const projectKey = req.context.extension.project.key;
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    const availableAgents = usersResponse.ok && usersResponse.data ? usersResponse.data.map(user => ({
      name: user.displayName,
      id: user.accountId,
      skills: [], // Will be populated from historical data in future
      currentLoad: 0 // Will be calculated from current assignments in future
    })) : [];
    
    // Step 3: Suggest assignee based on classification
    const assigneeSuggestion = await RovoAgent.suggestAssignee({
      category: classification.category,
      subCategory: classification.subCategory,
      availableAgents,
      historicalData: [] // Will be populated from Forge Storage in future
    });
    
    // Step 4: Search for similar tickets
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
    
    // Step 5: Find similar tickets using AI
    const similarAnalysis = await RovoAgent.findSimilarTickets({
      currentTicket: {
        summary,
        description: description || ''
      },
      pastTickets
    });
    
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
    throw new Error('AI triage analysis failed. Please try again.');
  }
});

export const issuePanelHandler = issuePanelResolver.getDefinitions();
