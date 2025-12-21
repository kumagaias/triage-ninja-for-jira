import { JiraClient } from '../services/jiraClient';

/**
 * Change Assignee Resolver
 * Updates the assignee of a ticket
 */
export async function changeAssignee(req: any) {
  const timestamp = new Date().toISOString();
  const { issueKey, accountId } = req.payload;
  
  console.log('[changeAssignee] Changing assignee', {
    timestamp,
    issueKey,
    accountId
  });
  
  try {
    // Validate inputs
    if (!issueKey || typeof issueKey !== 'string') {
      throw new Error('Invalid input: issueKey is required');
    }
    
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Invalid input: accountId is required');
    }
    
    // Update assignee
    const response = await JiraClient.assignIssue(issueKey, accountId);
    
    if (!response.ok) {
      throw new Error(`Failed to assign issue: ${response.error}`);
    }
    
    console.log('[changeAssignee] Assignee changed successfully', {
      timestamp,
      issueKey,
      accountId
    });
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('[changeAssignee] Error:', {
      timestamp,
      issueKey,
      accountId,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
