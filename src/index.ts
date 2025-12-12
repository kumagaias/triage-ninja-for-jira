import Resolver from '@forge/resolver';
import { JiraClient } from './services/jiraClient';

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
    description: data.fields.description,
    reporter: data.fields.reporter,
    assignee: data.fields.assignee,
    created: data.fields.created,
    updated: data.fields.updated,
    priority: data.fields.priority,
    status: data.fields.status,
    issueType: data.fields.issuetype,
    labels: data.fields.labels,
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
 * Trigger AI triage analysis
 * This will be connected to Rovo Agent in later tasks
 */
issuePanelResolver.define('runAITriage', async (req) => {
  // Mock AI analysis result for now
  return {
    category: 'Network & Connectivity',
    subCategory: 'VPN Issues',
    priority: 'High',
    urgency: 'Urgent',
    confidence: 94,
    reasoning: 'Based on keywords: VPN, connection, remote access',
    tags: ['vpn', 'remote-work', 'connectivity'],
    suggestedAssignee: {
      name: 'Alex Chen',
      reason: 'VPN specialist, 95% success rate',
      estimatedTime: '25min'
    },
    similarTickets: []
  };
});

export const issuePanelHandler = issuePanelResolver.getDefinitions();
