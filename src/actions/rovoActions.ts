import { JiraClient } from '../services/jiraClient';
import { calculateUserWorkload, escapeJqlText } from '../utils/helpers';
import {
  MIN_SIMILARITY_KEYWORD_LENGTH,
  MAX_SIMILARITY_KEYWORDS,
  SIMILARITY_SCORE_MULTIPLIER,
  MAX_SIMILAR_TICKETS,
  DESCRIPTION_TRUNCATE_LENGTH
} from '../utils/constants';

/**
 * Rovo Action: Analyze Ticket Classification
 * Fetches ticket data and returns structured information for Rovo Agent to analyze
 */
export async function analyzeTicketClassification(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = payload;
  
  // Validate context structure
  if (!context || typeof context !== 'object') {
    const error = 'Invalid context: context object is required';
    console.error('[analyzeTicketClassification] Context validation error:', {
      timestamp,
      error,
      receivedContext: typeof context
    });
    throw new Error(error);
  }
  
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
      context: {
        hasDescription: Boolean(ticket.fields.description),
        descriptionLength: (ticket.fields.description || '').length,
        summaryLength: ticket.fields.summary?.length || 0,
        age: ticket.fields.created ? 
          Math.floor((Date.now() - new Date(ticket.fields.created).getTime()) / (1000 * 60 * 60)) : 0
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
    console.error('[analyzeTicketClassification] Error:', {
      timestamp,
      issueKey,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
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
 */
export async function suggestTicketAssignee(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey, category } = payload;
  
  // Validate context structure
  if (!context || typeof context !== 'object') {
    const error = 'Invalid context: context object is required';
    console.error('[suggestTicketAssignee] Context validation error:', {
      timestamp,
      error,
      receivedContext: typeof context
    });
    throw new Error(error);
  }
  
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
      const currentLoad = await calculateUserWorkload(user.accountId, projectKey);
      
      availableAgents.push({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || '',
        currentLoad,
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
    console.error('[suggestTicketAssignee] Error:', {
      timestamp,
      issueKey,
      category,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
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
 */
export async function findSimilarTickets(payload: any, context: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = payload;
  
  // Validate context structure
  if (!context || typeof context !== 'object') {
    const error = 'Invalid context: context object is required';
    console.error('[findSimilarTickets] Context validation error:', {
      timestamp,
      error,
      receivedContext: typeof context
    });
    throw new Error(error);
  }
  
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
      .filter((word: string) => word.length > MIN_SIMILARITY_KEYWORD_LENGTH)
      .slice(0, MAX_SIMILARITY_KEYWORDS)
      .map(word => escapeJqlText(word))
      .join(' ');
    
    // Search for resolved tickets with similar keywords
    let similarTickets: any[] = [];
    if (keywords) {
      const searchResponse = await JiraClient.searchIssues({
        jql: `project = ${projectKey} AND statusCategory = Done AND text ~ "${keywords}" ORDER BY resolutiondate DESC`,
        maxResults: 10,
        fields: ['summary', 'description', 'resolution', 'resolutiondate', 'created', 'assignee', 'status']
      });
      
      if (searchResponse.ok && searchResponse.data?.issues) {
        similarTickets = searchResponse.data.issues.map(issue => {
          const issueSummary = issue.fields.summary?.toLowerCase() || '';
          const issueDescription = issue.fields.description?.toLowerCase() || '';
          const searchTerms = keywords.toLowerCase().split(' ');
          
          let matchCount = 0;
          for (const term of searchTerms) {
            if (issueSummary.includes(term) || issueDescription.includes(term)) {
              matchCount++;
            }
          }
          
          const similarityScore = Math.round((matchCount / searchTerms.length) * SIMILARITY_SCORE_MULTIPLIER);
          
          return {
            key: issue.key,
            summary: issue.fields.summary || '',
            description: (issue.fields.description || '').substring(0, DESCRIPTION_TRUNCATE_LENGTH),
            resolution: issue.fields.resolution?.name || 'Resolved',
            resolutionDate: issue.fields.resolutiondate || issue.fields.created,
            assignee: issue.fields.assignee?.displayName || 'Unknown',
            status: issue.fields.status?.name || 'Done',
            similarityScore
          };
        });
        
        similarTickets.sort((a, b) => b.similarityScore - a.similarityScore);
        similarTickets = similarTickets.slice(0, MAX_SIMILAR_TICKETS);
      }
    }
    
    const result = {
      issueKey,
      currentTicket: {
        summary,
        description: description.substring(0, DESCRIPTION_TRUNCATE_LENGTH),
        projectKey
      },
      similarTickets,
      totalFound: similarTickets.length,
      searchKeywords: keywords
    };
    
    console.log('[findSimilarTickets] Success', {
      timestamp,
      issueKey,
      totalFound: result.totalFound,
      searchKeywords: keywords
    });
    
    return result;
    
  } catch (error) {
    console.error('[findSimilarTickets] Error:', {
      timestamp,
      issueKey,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new Error(
      `Failed to find similar tickets for ${issueKey}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
