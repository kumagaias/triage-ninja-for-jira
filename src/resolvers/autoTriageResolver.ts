import { analyzeTicketClassification, suggestTicketAssignee } from '../actions/rovoActions';
import { JiraClient } from '../services/jiraClient';

/**
 * Auto Triage Resolver
 * Executes complete triage workflow: analyze, suggest assignee, and update ticket
 */
export async function runAutoTriage(req: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = req.payload;
  const context = req.context;
  
  console.log('[runAutoTriage] Starting auto triage', {
    timestamp,
    issueKey,
    accountId: context?.accountId || 'unknown'
  });
  
  try {
    // Validate input
    if (!issueKey || typeof issueKey !== 'string') {
      throw new Error('Invalid input: issueKey is required');
    }
    
    // Step 1: Analyze ticket classification
    console.log('[runAutoTriage] Step 1: Analyzing classification', { issueKey });
    const classification = await analyzeTicketClassification({ issueKey }, context);
    
    // Extract category from labels or use default
    const category = classification.labels?.[0] || 'General';
    
    // Step 2: Suggest assignee
    console.log('[runAutoTriage] Step 2: Suggesting assignee', { issueKey, category });
    const assigneeSuggestion = await suggestTicketAssignee({ issueKey, category }, context);
    
    // Check if we have a recommendation
    if (!assigneeSuggestion.recommendation) {
      throw new Error('No assignee recommendation available');
    }
    
    // Step 3: Get current ticket data
    const ticketResponse = await JiraClient.getIssue(issueKey);
    if (!ticketResponse.ok || !ticketResponse.data) {
      throw new Error('Failed to fetch current ticket data');
    }
    
    const currentTicket = ticketResponse.data;
    const existingLabels = currentTicket.fields.labels || [];
    
    // Determine priority based on classification
    const priorityMap: { [key: string]: string } = {
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    };
    const newPriority = priorityMap[classification.currentPriority] || 'Medium';
    
    // Step 4: Update ticket
    console.log('[runAutoTriage] Step 3: Updating ticket', {
      issueKey,
      assignee: assigneeSuggestion.recommendation.displayName,
      priority: newPriority,
      category
    });
    
    const updateResponse = await JiraClient.updateIssue(issueKey, {
      assignee: { accountId: assigneeSuggestion.recommendation.accountId } as any,
      priority: { name: newPriority } as any,
      labels: [...new Set([...existingLabels, `category:${category}`, 'ai-triaged'])]
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update ticket: ${updateResponse.error}`);
    }
    
    // Step 5: Add comment
    console.log('[runAutoTriage] Step 4: Adding comment', { issueKey });
    const commentBody = `🤖 *AI Triage Completed*

*Analysis Results:*
• *Category:* ${category}
• *Priority:* ${newPriority}
• *Assigned to:* ${assigneeSuggestion.recommendation.displayName}
• *Reason:* ${assigneeSuggestion.recommendation.reasoning}

_Triaged by TriageNinja AI Agent at ${new Date().toLocaleString()}_`;
    
    const commentResponse = await JiraClient.addComment(issueKey, commentBody);
    
    if (!commentResponse.ok) {
      console.warn('[runAutoTriage] Failed to add comment', {
        issueKey,
        error: commentResponse.error
      });
      // Don't fail the whole operation if comment fails
    }
    
    // Get top 3 candidates (including the assigned one)
    const topCandidates = assigneeSuggestion.availableAgents
      .slice(0, 3)
      .map((agent: any) => ({
        accountId: agent.accountId,
        displayName: agent.displayName,
        currentLoad: agent.currentLoad,
        reasoning: `Current workload: ${agent.currentLoad} open tickets`
      }));
    
    console.log('[runAutoTriage] Auto triage completed successfully', {
      timestamp,
      issueKey,
      assignee: assigneeSuggestion.recommendation.displayName,
      priority: newPriority,
      category,
      candidatesCount: topCandidates.length
    });
    
    return {
      success: true,
      result: {
        issueKey,
        category,
        priority: newPriority,
        assignee: {
          accountId: assigneeSuggestion.recommendation.accountId,
          displayName: assigneeSuggestion.recommendation.displayName
        },
        reasoning: assigneeSuggestion.recommendation.reasoning,
        candidates: topCandidates
      }
    };
    
  } catch (error) {
    console.error('[runAutoTriage] Error:', {
      timestamp,
      issueKey,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
