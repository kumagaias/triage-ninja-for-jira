import Resolver from '@forge/resolver';
import { JiraClient } from '../services/jiraClient';
import * as RovoAgent from '../services/rovoAgent';
import { calculateUserWorkload, escapeJqlText } from '../utils/helpers';
import { MIN_KEYWORD_LENGTH, MAX_SEARCH_KEYWORDS } from '../utils/constants';

/**
 * Issue Panel Resolver
 * Handles all issue panel operations including issue details,
 * assignable users, similar ticket search, and AI triage
 */
const issuePanelResolver = new Resolver();

/**
 * Get issue details for AI triage
 */
issuePanelResolver.define('getIssueDetails', async (req) => {
  const issueKey = req.context.extension.issue.key;
  
  const response = await JiraClient.getIssue(issueKey);
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch issue details:', response.error);
    throw new Error('Failed to load issue details');
  }
  
  const data = response.data;
  
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
 * Search for similar tickets using JQL
 */
issuePanelResolver.define('searchSimilarTickets', async (req) => {
  const payload = req.payload as { summary?: string; projectKey?: string };
  const { summary, projectKey } = payload;
  
  if (!summary || !projectKey) {
    console.error('Missing required parameters: summary or projectKey');
    throw new Error('Missing required parameters: summary or projectKey');
  }
  
  const keywords = (summary as string)
    .split(' ')
    .filter((word: string) => word.length > MIN_KEYWORD_LENGTH)
    .slice(0, MAX_SEARCH_KEYWORDS)
    .map(word => escapeJqlText(word))
    .join(' ');
  
  if (!keywords) {
    console.warn('No valid keywords extracted from summary for similar ticket search.');
    return [];
  }
  
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
    const classification = await RovoAgent.classifyTicket({
      issueKey,
      summary,
      description: description || '',
      reporter: reporter || 'Unknown',
      created: created || new Date().toISOString()
    });
    
    if (!req.context || !req.context.extension || !req.context.extension.project || !req.context.extension.project.key) {
      throw new Error('Project key is missing from request context. Cannot proceed with AI triage.');
    }
    const projectKey = req.context.extension.project.key;
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
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
    
    if (error && typeof error === 'object') {
      const err = error as any;
      
      if (err.name === 'FetchError' || err.message?.includes('network') || err.message?.includes('Network')) {
        throw new Error('AI triage analysis failed due to a network error. Please check your connection and try again.');
      }
      
      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        throw new Error('AI triage analysis timed out. Please try again later.');
      }
      
      if (err.message?.includes('service unavailable') || err.message?.includes('Service Unavailable')) {
        throw new Error('AI triage analysis failed because the AI service is unavailable. Please try again later.');
      }
      
      if (err.message?.includes('not valid JSON')) {
        throw new Error('AI triage analysis returned an invalid response. Please try again.');
      }
      
      if (err.message?.includes('Project key is missing')) {
        throw new Error('Unable to access project information. Please refresh the page and try again.');
      }
      
      const errorType = err.name || 'UnknownError';
      throw new Error(`AI triage analysis failed (${errorType}). Please try again.`);
    }
    
    throw new Error('AI triage analysis failed due to an unknown error. Please try again.');
  }
});

/**
 * Apply AI triage results to the issue
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

/**
 * Add label to issue
 */
issuePanelResolver.define('addLabelToIssue', async (req) => {
  const timestamp = new Date().toISOString();
  const payload = req.payload as { issueKey: string; label: string };
  const { issueKey, label } = payload;
  
  console.log('[addLabelToIssue] Resolver invoked', {
    timestamp,
    issueKey,
    label,
    accountId: req.context?.accountId || 'unknown'
  });
  
  try {
    if (!issueKey || typeof issueKey !== 'string') {
      const error = 'Invalid input: issueKey is required and must be a string';
      console.error('[addLabelToIssue] Validation error:', {
        timestamp,
        error,
        receivedIssueKey: issueKey
      });
      throw new Error(error);
    }
    
    if (!label || typeof label !== 'string') {
      const error = 'Invalid input: label is required and must be a string';
      console.error('[addLabelToIssue] Validation error:', {
        timestamp,
        error,
        receivedLabel: label
      });
      throw new Error(error);
    }
    
    const issueResponse = await JiraClient.getIssue(issueKey);
    if (!issueResponse.ok || !issueResponse.data) {
      const error = `Failed to fetch issue: ${issueResponse.error || 'Unknown error'}`;
      console.error('[addLabelToIssue] Issue fetch error:', {
        timestamp,
        issueKey,
        error: issueResponse.error,
        statusCode: issueResponse.status
      });
      throw new Error(error);
    }
    
    const existingLabels = issueResponse.data.fields.labels || [];
    
    if (existingLabels.includes(label)) {
      console.log('[addLabelToIssue] Label already exists', {
        timestamp,
        issueKey,
        label
      });
      return {
        success: true,
        message: 'Label already exists on issue',
        alreadyExists: true
      };
    }
    
    const updatedLabels = [...existingLabels, label];
    
    const updateResponse = await JiraClient.updateIssue(issueKey, {
      labels: updatedLabels
    });
    
    if (!updateResponse.ok) {
      const error = `Failed to add label: ${updateResponse.error || 'Unknown error'}`;
      console.error('[addLabelToIssue] Update error:', {
        timestamp,
        issueKey,
        label,
        error: updateResponse.error,
        statusCode: updateResponse.status
      });
      throw new Error(error);
    }
    
    console.log('[addLabelToIssue] Success', {
      timestamp,
      issueKey,
      label,
      totalLabels: updatedLabels.length
    });
    
    return {
      success: true,
      message: 'Label added successfully'
    };
    
  } catch (error) {
    console.error('[addLabelToIssue] Error:', {
      timestamp,
      issueKey,
      label,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new Error(
      `Failed to add label to ${issueKey}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
});

export const issuePanelHandler = issuePanelResolver.getDefinitions();
