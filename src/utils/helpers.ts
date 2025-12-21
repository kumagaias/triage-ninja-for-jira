import { JiraClient } from '../services/jiraClient';

/**
 * Calculate workload for a user (count of open tickets)
 * @param accountId - User account ID
 * @param projectKey - Project key
 * @returns Number of open tickets assigned to the user
 */
export async function calculateUserWorkload(accountId: string, projectKey: string): Promise<number> {
  const workloadResponse = await JiraClient.searchIssues({
    jql: `project = ${projectKey} AND assignee = "${accountId}" AND statusCategory != Done`,
    maxResults: 100,
    fields: ['key']
  });
  
  return workloadResponse.ok && workloadResponse.data?.issues 
    ? workloadResponse.data.issues.length 
    : 0;
}

/**
 * Escape special characters in JQL text search
 * Prevents JQL injection by escaping quotes and backslashes
 */
export function escapeJqlText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
