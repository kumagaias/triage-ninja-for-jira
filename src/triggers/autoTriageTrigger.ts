/**
 * Auto-Triage Trigger
 * Automatically triages new Jira issues when they are created
 */

import { storage } from '@forge/api';
import { JiraClient } from '../services/jiraClient';
import * as RovoAgent from '../services/rovoAgent';
import { calculateUserWorkload } from '../utils/helpers';

/**
 * Auto-Triage Trigger Handler
 * Called automatically when a new issue is created in Jira
 * 
 * This function:
 * 1. Checks if auto-triage is enabled
 * 2. Fetches the issue details
 * 3. Classifies the ticket using Rovo Agent
 * 4. Suggests an assignee based on workload
 * 5. Updates the ticket with the results
 */
export async function autoTriageTriggerHandler(event: any, context: any) {
  console.log('[autoTriageTrigger] Event received', {
    issueKey: event.issue?.key,
    timestamp: new Date().toISOString()
  });

  try {
    // Check if auto-triage is enabled
    const autoTriageEnabled = await storage.get('autoTriageEnabled');
    
    if (autoTriageEnabled === false) {
      console.log('[autoTriageTrigger] Auto-triage is disabled, skipping');
      return;
    }

    const issueKey = event.issue?.key;
    const issueId = event.issue?.id;

    if (!issueKey || !issueId) {
      console.error('[autoTriageTrigger] Missing issue key or ID');
      return;
    }

    console.log('[autoTriageTrigger] Starting auto-triage for:', issueKey);

    // Fetch full issue details using app context (triggers don't have user context)
    const issueResponse = await JiraClient.getIssueAsApp(issueKey, [
      'summary',
      'description',
      'reporter',
      'created',
      'project',
      'assignee'
    ]);

    if (!issueResponse.ok || !issueResponse.data) {
      console.error('[autoTriageTrigger] Failed to fetch issue:', issueResponse.error);
      return;
    }

    const issue = issueResponse.data;

    // Skip if already assigned
    if (issue.fields.assignee) {
      console.log('[autoTriageTrigger] Issue already assigned, skipping');
      return;
    }

    const projectKey = issue.fields.project.key;

    // Step 1: Classify the ticket
    console.log('[autoTriageTrigger] Classifying ticket');
    
    const classification = await RovoAgent.classifyTicket({
      issueKey,
      summary: issue.fields.summary,
      description: issue.fields.description || '',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      created: issue.fields.created
    });

    console.log('[autoTriageTrigger] Classification complete:', {
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence
    });

    // Step 2: Get assignable users and calculate workload
    console.log('[autoTriageTrigger] Fetching assignable users');
    
    const usersResponse = await JiraClient.getAssignableUsersAsApp(projectKey, 50);
    
    let suggestedAssigneeId: string | null = null;
    let assigneeReason = '';

    if (usersResponse.ok && usersResponse.data) {
      const activeUsers = usersResponse.data.filter(user => user.active === true);
      
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

      console.log('[autoTriageTrigger] Available agents:', availableAgents.length);

      // Step 3: Suggest assignee
      const assigneeSuggestion = await RovoAgent.suggestAssignee({
        category: classification.category,
        subCategory: classification.subCategory,
        availableAgents,
        historicalData: []
      });

      suggestedAssigneeId = assigneeSuggestion.assigneeId;
      assigneeReason = assigneeSuggestion.reason;

      console.log('[autoTriageTrigger] Assignee suggested:', {
        assignee: assigneeSuggestion.assignee,
        reason: assigneeReason
      });
    }

    // Step 4: Update the ticket using app context
    console.log('[autoTriageTrigger] Updating ticket');

    const updateFields: any = {
      priority: { name: classification.priority }
    };

    if (suggestedAssigneeId) {
      updateFields.assignee = { accountId: suggestedAssigneeId };
    }

    // Add category as label
    const categoryLabel = `${classification.category}-${classification.subCategory}`.replace(/\s+/g, '-');
    updateFields.labels = [categoryLabel];

    const updateResponse = await JiraClient.updateIssueAsApp(issueKey, updateFields);

    if (!updateResponse.ok) {
      console.error('[autoTriageTrigger] Failed to update issue:', updateResponse.error);
      
      // Try without assignee if update failed
      if (suggestedAssigneeId) {
        console.log('[autoTriageTrigger] Retrying without assignee');
        delete updateFields.assignee;
        const retryResponse = await JiraClient.updateIssueAsApp(issueKey, updateFields);
        
        if (!retryResponse.ok) {
          console.error('[autoTriageTrigger] Retry also failed:', retryResponse.error);
          return;
        }
      } else {
        return;
      }
    }

    // Step 5: Add comment with triage results using app context
    const comment = `🤖 **AI Triage Complete**

- **Category**: ${classification.category} / ${classification.subCategory}
- **Priority**: ${classification.priority}
- **Confidence**: ${classification.confidence}%
${suggestedAssigneeId ? `- **Assigned to**: Based on current workload and expertise` : ''}

This ticket has been automatically classified and assigned by TriageNinja.`;

    await JiraClient.addCommentAsApp(issueKey, comment);

    console.log('[autoTriageTrigger] Auto-triage completed successfully', {
      issueKey,
      category: classification.category,
      priority: classification.priority,
      assignee: suggestedAssigneeId ? 'assigned' : 'not assigned'
    });

  } catch (error) {
    console.error('[autoTriageTrigger] Auto-triage failed:', error);
    // Don't throw error - we don't want to block issue creation
  }
}
