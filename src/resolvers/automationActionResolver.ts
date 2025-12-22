/**
 * Automation Action Resolver
 * Handles Jira Automation actions for automatic ticket triage
 */

import { JiraClient } from '../services/jiraClient';
import * as RovoAgent from '../services/rovoAgent';
import { calculateUserWorkload } from '../utils/helpers';

interface AutoTriageInput {
  issueKey: string;
}

interface AutoTriageOutput {
  category: string;
  priority: string;
  assignee: string | null;
  confidence: number;
}

/**
 * Automation Action Handler for Auto-Triage
 * Called by Jira Automation when a rule triggers
 * 
 * This function:
 * 1. Fetches the ticket details
 * 2. Calls Rovo Agent for classification
 * 3. Suggests an assignee based on workload
 * 4. Returns results to Automation for ticket update
 */
export async function automationAutoTriageHandler(
  event: any,
  context: any
): Promise<AutoTriageOutput> {
  console.log('[automationAutoTriage] Starting automation action', {
    issueKey: event.inputs.issueKey,
    timestamp: new Date().toISOString()
  });

  const { issueKey } = event.inputs as AutoTriageInput;

  if (!issueKey) {
    throw new Error('Missing required input: issueKey');
  }

  try {
    // Step 1: Fetch ticket details
    console.log('[automationAutoTriage] Fetching ticket details:', issueKey);
    
    const issueResponse = await JiraClient.getIssue(issueKey, [
      'summary',
      'description',
      'reporter',
      'created',
      'project'
    ]);

    if (!issueResponse.ok || !issueResponse.data) {
      throw new Error(`Failed to fetch ticket ${issueKey}: ${issueResponse.error}`);
    }

    const issue = issueResponse.data;
    const projectKey = issue.fields.project.key;

    console.log('[automationAutoTriage] Ticket fetched:', {
      issueKey,
      projectKey,
      summary: issue.fields.summary
    });

    // Step 2: Classify the ticket using Rovo Agent
    console.log('[automationAutoTriage] Classifying ticket with Rovo Agent');
    
    const classification = await RovoAgent.classifyTicket({
      summary: issue.fields.summary,
      description: issue.fields.description || '',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      created: issue.fields.created
    });

    console.log('[automationAutoTriage] Classification complete:', {
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence
    });

    // Step 3: Get assignable users and calculate workload
    console.log('[automationAutoTriage] Fetching assignable users');
    
    const usersResponse = await JiraClient.getAssignableUsers(projectKey, 50);
    
    let suggestedAssigneeId: string | null = null;

    if (usersResponse.ok && usersResponse.data) {
      // Filter active users only
      const activeUsers = usersResponse.data.filter(user => user.active === true);
      
      // Calculate workload for each user
      const availableAgents = [];
      for (const user of activeUsers) {
        const currentLoad = await calculateUserWorkload(user.accountId, projectKey);
        availableAgents.push({
          name: user.displayName,
          id: user.accountId,
          skills: [],
          currentLoad
        });
      }

      console.log('[automationAutoTriage] Available agents:', availableAgents.length);

      // Step 4: Suggest assignee using Rovo Agent
      const assigneeSuggestion = await RovoAgent.suggestAssignee({
        category: classification.category,
        subCategory: classification.subCategory,
        availableAgents,
        historicalData: []
      });

      suggestedAssigneeId = assigneeSuggestion.assigneeId;

      console.log('[automationAutoTriage] Assignee suggested:', {
        assignee: assigneeSuggestion.assignee,
        reason: assigneeSuggestion.reason
      });
    } else {
      console.warn('[automationAutoTriage] Failed to fetch assignable users');
    }

    // Step 5: Return results to Automation
    const result: AutoTriageOutput = {
      category: `${classification.category} / ${classification.subCategory}`,
      priority: classification.priority,
      assignee: suggestedAssigneeId,
      confidence: classification.confidence
    };

    console.log('[automationAutoTriage] Action complete:', result);

    return result;
  } catch (error) {
    console.error('[automationAutoTriage] Action failed:', error);
    
    // Return error information to Automation
    // Automation will stop rule execution and notify the rule owner
    throw new Error(`Auto-triage failed for ${issueKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
