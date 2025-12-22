import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import api, { route } from '@forge/api';
import { JiraClient } from '../services/jiraClient';
import * as RovoAgent from '../services/rovoAgent';
import * as ForgeLlmTriage from '../services/forgeLlmTriage';
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
    fields: ['summary', 'priority', 'created', 'reporter', 'assignee', 'status', 'duedate']
  });
  
  if (!response.ok || !response.data) {
    console.error('Failed to fetch tickets:', response.error);
    return [];
  }
  
  return response.data.issues || [];
});

/**
 * Get project members with their ticket counts
 */
dashboardResolver.define('getProjectMembers', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  try {
    // Get assignable users for the project
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
    if (!usersResponse.ok || !usersResponse.data) {
      console.error('Failed to fetch assignable users:', usersResponse.error);
      return [];
    }
    
    // Filter only active users
    const activeUsers = usersResponse.data.filter(user => user.active === true);
    
    // Get ticket count for each active user
    const membersWithCounts = await Promise.all(
      activeUsers.map(async (user) => {
        const ticketCount = await calculateUserWorkload(user.accountId, projectKey);
        return {
          accountId: user.accountId,
          displayName: user.displayName,
          role: 'Member', // TODO: Fetch actual role from project roles API
          ticketCount
        };
      })
    );
    
    // Sort by ticket count (descending)
    membersWithCounts.sort((a, b) => b.ticketCount - a.ticketCount);
    
    return membersWithCounts;
  } catch (error) {
    console.error('Error in getProjectMembers:', error);
    return [];
  }
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
    
    // Get today's processed tickets (assigned today - changed from EMPTY to not EMPTY today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Search for tickets that were assigned today (assignee changed from empty to not empty)
    // This captures tickets that were triaged today
    const todayProcessedResponse = await JiraClient.searchIssues({
      jql: `project = ${projectKey} AND assignee changed FROM EMPTY AFTER "${todayStr}"`,
      maxResults: 100, // Get up to 100 tickets to count
      fields: ['key'] // Only need the key field
    });
    
    const todayProcessedCount = todayProcessedResponse.ok && todayProcessedResponse.data?.issues
      ? todayProcessedResponse.data.issues.length
      : 0;
    
    // Get this week's processed tickets (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];
    
    const weekProcessedResponse = await JiraClient.searchIssues({
      jql: `project = ${projectKey} AND assignee changed FROM EMPTY AFTER "${mondayStr}"`,
      maxResults: 100,
      fields: ['key']
    });
    
    const weekProcessedCount = weekProcessedResponse.ok && weekProcessedResponse.data?.issues
      ? weekProcessedResponse.data.issues.length
      : 0;
    
    // Get overdue tickets count (due date is in the past and not Done)
    const overdueJql = `project = ${projectKey} AND due < now() AND statusCategory != Done`;
    
    const overdueResponse = await JiraClient.searchIssues({
      jql: overdueJql,
      maxResults: 100,
      fields: ['key']
    });
    
    const overdueCount = overdueResponse.ok && overdueResponse.data?.issues
      ? overdueResponse.data.issues.length
      : 0;
    
    // Get open tickets count (all tickets not in Done status)
    const openJql = `project = ${projectKey} AND statusCategory != Done`;
    
    const openResponse = await JiraClient.searchIssues({
      jql: openJql,
      maxResults: 100,
      fields: ['key']
    });
    
    const openTickets = openResponse.ok && openResponse.data?.issues
      ? openResponse.data.issues.length
      : 0;
    
    // Calculate AI Accuracy based on feedback labels
    // Get all AI-triaged tickets with feedback labels
    const feedbackJql = `project = ${projectKey} AND labels in (ai-correct, ai-incorrect)`;
    
    const feedbackResponse = await JiraClient.searchIssues({
      jql: feedbackJql,
      maxResults: 100,
      fields: ['labels']
    });
    
    let aiAccuracy = 94; // Default value if no feedback data
    
    if (feedbackResponse.ok && feedbackResponse.data?.issues && feedbackResponse.data.issues.length > 0) {
      const issues = feedbackResponse.data.issues;
      let correctCount = 0;
      let incorrectCount = 0;
      
      issues.forEach((issue: any) => {
        const labels = issue.fields.labels || [];
        if (labels.includes('ai-correct')) {
          correctCount++;
        }
        if (labels.includes('ai-incorrect')) {
          incorrectCount++;
        }
      });
      
      const totalFeedback = correctCount + incorrectCount;
      if (totalFeedback > 0) {
        aiAccuracy = Math.round((correctCount / totalFeedback) * 100);
        console.log('[getStatistics] AI Accuracy calculated:', {
          correct: correctCount,
          incorrect: incorrectCount,
          total: totalFeedback,
          accuracy: aiAccuracy
        });
      }
    }
    
    const result = {
      untriagedCount,
      todayProcessed: todayProcessedCount,
      weekProcessed: weekProcessedCount,
      overdueCount,
      openTickets,
      aiAccuracy
    };
    
    console.log('[getStatistics] Result:', result);
    return result;
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    // Return zeros on error
    return {
      untriagedCount: 0,
      todayProcessed: 0,
      weekProcessed: 0,
      overdueCount: 0,
      openTickets: 0,
      aiAccuracy: 0
    };
  }
});

/**
 * Create test tickets for demo purposes
 * Creates sample tickets with various priorities and categories
 * Includes random priorities and due dates
 */
dashboardResolver.define('createTestTickets', async (req) => {
  const projectKey = req.context.extension.project.key;
  
  // Realistic test ticket templates
  const testTickets = [
    {
      summary: 'Password Reset Request',
      description: 'I am unable to log in to my company account. Could you please reset my password?'
    },
    {
      summary: 'VPN Connection Issue',
      description: 'I cannot connect to the VPN from my home network. I keep receiving a "Connection Timed Out" error.'
    },
    {
      summary: 'Software Installation',
      description: 'I need to install Adobe Acrobat Pro for my new project. Could you please authorize the installation?'
    },
    {
      summary: 'Outlook Sync Error',
      description: 'My Outlook is not receiving new emails, and the status bar says "Disconnected." I have already tried restarting the app.'
    },
    {
      summary: 'Hardware Upgrade',
      description: 'My laptop has been running very slowly lately. I would like to request an additional 8GB of RAM.'
    },
    {
      summary: 'Printer Connection Failure',
      description: 'I am unable to connect to the printer on the 3rd floor (Printer-3F-02). It is not showing up in my list of devices.'
    },
    {
      summary: 'New Hire Account Setup',
      description: 'We have a new team member joining on Monday. Please set up their AD account and email address.'
    },
    {
      summary: 'Blue Screen Error (BSOD)',
      description: 'My computer crashed suddenly and displayed a blue screen with an error code. I have attached a photo of the screen.'
    },
    {
      summary: 'Access Permission Request',
      description: 'I need "Read/Write" access to the "Marketing_2024" folder on the shared drive for an upcoming audit.'
    },
    {
      summary: 'Monitor Not Detected',
      description: 'My second monitor is blank and says "No Signal," even though it is plugged in. I\'ve tried swapping the HDMI cable.'
    }
  ];
  
  // Priority options
  const priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
  
  // Helper function to get random priority
  const getRandomPriority = () => {
    return priorities[Math.floor(Math.random() * priorities.length)];
  };
  
  // Helper function to get random due date (none or 1-7 days from now)
  const getRandomDueDate = () => {
    const random = Math.random();
    if (random < 0.3) {
      // 30% chance of no due date
      return null;
    }
    // 70% chance of due date 1-7 days from now
    const daysFromNow = Math.floor(Math.random() * 7) + 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };
  
  try {
    const createdTickets = [];
    
    // Randomly select 3 tickets from the template list
    const shuffled = [...testTickets].sort(() => Math.random() - 0.5);
    const selectedTickets = shuffled.slice(0, 3);
    
    for (const ticket of selectedTickets) {
      const fields: any = {
        project: { key: projectKey },
        summary: ticket.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticket.description
                }
              ]
            }
          ]
        },
        issuetype: { name: 'Task' },
        priority: { name: getRandomPriority() }
      };
      
      // Add due date if randomly selected
      const dueDate = getRandomDueDate();
      if (dueDate) {
        fields.duedate = dueDate;
      }
      
      const response = await JiraClient.createIssue({ fields });
      
      if (response.ok && response.data) {
        createdTickets.push(response.data.key);
        console.log(`Created test ticket: ${response.data.key} - ${ticket.summary} (Priority: ${fields.priority.name}, Due: ${dueDate || 'None'})`);
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
/**
 * Run AI Triage using Forge LLM
 * Uses Atlassian-hosted LLMs for ticket classification and assignee suggestion
 */
dashboardResolver.define('runAITriage', async (req) => {
  const timestamp = new Date().toISOString();
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
  
  console.log('[runAITriage] Starting with Forge LLM', { issueKey, timestamp });
  
  try {
    // Get project key from context
    if (!req.context?.extension?.project?.key) {
      throw new Error('Project key is missing from request context');
    }
    const projectKey = req.context.extension.project.key;
    
    // Get project members for assignee suggestion
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    const projectMembers = [];
    
    if (usersResponse.ok && usersResponse.data) {
      // Filter active users and calculate workload
      const activeUsers = usersResponse.data.filter(user => user.active === true);
      
      for (const user of activeUsers) {
        const ticketCount = await calculateUserWorkload(user.accountId, projectKey);
        projectMembers.push({
          accountId: user.accountId,
          displayName: user.displayName,
          ticketCount
        });
      }
    }
    
    console.log('[runAITriage] Project members loaded:', projectMembers.length);
    
    // Perform complete triage using Forge LLM
    const triageResult = await ForgeLlmTriage.performCompleteTriage(
      {
        issueKey,
        summary,
        description: description || '',
        reporter: reporter || 'Unknown',
        created: created || new Date().toISOString()
      },
      projectMembers
    );
    
    console.log('[runAITriage] Forge LLM triage completed', {
      issueKey,
      category: triageResult.category,
      priority: triageResult.priority,
      confidence: triageResult.confidence,
      assignee: triageResult.suggestedAssignee?.name || 'None'
    });
    
    // Return in the expected format
    return {
      category: triageResult.category,
      subCategory: triageResult.subCategory,
      priority: triageResult.priority,
      urgency: triageResult.urgency,
      confidence: triageResult.confidence,
      reasoning: triageResult.reasoning,
      tags: [],
      suggestedAssignee: {
        name: triageResult.suggestedAssignee?.name || null,
        id: triageResult.suggestedAssignee?.id || null,
        reason: triageResult.assigneeReason,
        estimatedTime: null,
        confidence: triageResult.assigneeConfidence,
        alternatives: []
      },
      similarTickets: [],
      suggestedActions: [],
      source: 'forge-llm'
    };
  } catch (error) {
    console.error('[runAITriage] Forge LLM triage failed:', error);
    
    // Fallback to keyword-based classification
    console.log('[runAITriage] Using keyword-based fallback', { issueKey });
    
    try {
      const classification = await RovoAgent.classifyTicket({
        issueKey,
        summary,
        description: description || '',
        reporter: reporter || 'Unknown',
        created: created || new Date().toISOString()
      });
      
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
      
      const assigneeSuggestion = await RovoAgent.suggestAssignee({
        category: classification.category,
        subCategory: classification.subCategory,
        availableAgents,
        historicalData: []
      });
      
      return {
        category: classification.category,
        subCategory: classification.subCategory,
        priority: classification.priority,
        urgency: classification.urgency,
        confidence: classification.confidence,
        reasoning: classification.reasoning + ' (keyword-based fallback)',
        tags: classification.tags,
        suggestedAssignee: {
          name: assigneeSuggestion.assignee,
          id: assigneeSuggestion.assigneeId,
          reason: assigneeSuggestion.reason,
          estimatedTime: assigneeSuggestion.estimatedTime,
          confidence: assigneeSuggestion.confidence,
          alternatives: assigneeSuggestion.alternatives
        },
        similarTickets: [],
        suggestedActions: [],
        source: 'keyword-fallback'
      };
    } catch (fallbackError) {
      console.error('[runAITriage] Fallback also failed:', fallbackError);
      throw new Error('AI triage analysis failed. Please try again.');
    }
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
    assigneeName?: string;
    category: string;
    subCategory: string;
    confidence?: number;
    reasoning?: string;
    source?: string;
  };
  
  const { issueKey, priority, assigneeId, assigneeName, category, subCategory, confidence, reasoning, source } = payload;
  
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
      updateFields.assignee = { accountId: assigneeId };
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
    
    console.log('[applyTriageResult] Update response:', {
      ok: updateResponse.ok,
      status: updateResponse.status,
      error: updateResponse.error,
      updateFields
    });
    
    if (!updateResponse.ok) {
      // Check if the error is about assignee permissions
      const errorObj = updateResponse.error as any;
      if (errorObj?.errors?.assignee) {
        console.warn('[applyTriageResult] Assignee error, retrying without assignee:', errorObj.errors.assignee);
        
        // Retry without assignee
        const { assignee, ...fieldsWithoutAssignee } = updateFields;
        const retryResponse = await JiraClient.updateIssue(issueKey, fieldsWithoutAssignee);
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to update issue: ${JSON.stringify(retryResponse.error)}`);
        }
        
        return {
          success: true,
          message: 'Triage result applied successfully (assignee skipped due to permissions)',
          warning: 'Could not assign user due to permissions'
        };
      }
      
      throw new Error(`Failed to update issue: ${JSON.stringify(updateResponse.error)}`);
    }
    
    // Add comment with triage results
    const aiSource = source === 'forge-llm' ? 'Forge LLM (Rovo)' : 'Keyword-based AI';
    const comment = `🤖 **AI Triage Complete** (${aiSource})

- **Category**: ${category}${subCategory ? ` / ${subCategory}` : ''}
- **Priority**: ${priority}
${assigneeName ? `- **Assigned to**: ${assigneeName}` : ''}
${confidence ? `- **Confidence**: ${confidence}%` : ''}
${reasoning ? `\n**Reasoning**: ${reasoning}` : ''}

This ticket has been classified and assigned by TriageNinja AI.`;

    await JiraClient.addComment(issueKey, comment);
    
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
 * Get auto-triage setting
 * Returns whether automatic triage is enabled for the project
 */
dashboardResolver.define('getAutoTriageSetting', async (req) => {
  const projectKey = req.context.extension.project.key;
  const storageKey = `auto-triage-${projectKey}`;
  
  try {
    const enabled = await storage.get(storageKey);
    // Default to true if not set
    return { enabled: enabled !== false };
  } catch (error) {
    console.error('Failed to get auto-triage setting:', error);
    return { enabled: true };
  }
});

/**
 * Set auto-triage setting
 * Enables or disables automatic triage for the project
 */
dashboardResolver.define('setAutoTriageSetting', async (req) => {
  const projectKey = req.context.extension.project.key;
  const payload = req.payload as { enabled: boolean };
  const storageKey = `auto-triage-${projectKey}`;
  
  try {
    await storage.set(storageKey, payload.enabled);
    console.log(`[setAutoTriageSetting] Auto-triage ${payload.enabled ? 'enabled' : 'disabled'} for project ${projectKey}`);
    
    return {
      success: true,
      enabled: payload.enabled
    };
  } catch (error) {
    console.error('Failed to set auto-triage setting:', error);
    throw new Error('Failed to update auto-triage setting');
  }
});

export const dashboardHandler = dashboardResolver.getDefinitions();
