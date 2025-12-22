import { analyzeTicketClassification, suggestTicketAssignee } from '../actions/rovoActions';
import { JiraClient } from '../services/jiraClient';
import api, { route } from '@forge/api';

/**
 * Auto Triage Resolver
 * Executes complete triage workflow: analyze, suggest assignee, and update ticket
 * Uses Rovo Agent for AI-powered analysis
 */
export async function runAutoTriage(req: any) {
  const timestamp = new Date().toISOString();
  const { issueKey } = req.payload;
  const context = req.context;
  
  console.log('[runAutoTriage] Starting auto triage with Rovo Agent', {
    timestamp,
    issueKey,
    accountId: context?.accountId || 'unknown'
  });
  
  try {
    // Validate input
    if (!issueKey || typeof issueKey !== 'string') {
      throw new Error('Invalid input: issueKey is required');
    }
    
    // Step 1: Get ticket data
    console.log('[runAutoTriage] Step 1: Fetching ticket data', { issueKey });
    const ticketResponse = await JiraClient.getIssue(issueKey);
    if (!ticketResponse.ok || !ticketResponse.data) {
      throw new Error('Failed to fetch ticket data');
    }
    
    const ticket = ticketResponse.data;
    const summary = ticket.fields.summary || '';
    const description = ticket.fields.description || '';
    
    // Step 2: Call Rovo Agent for classification
    console.log('[runAutoTriage] Step 2: Calling Rovo Agent for classification', { issueKey });
    
    try {
      // Try to invoke Rovo Agent via Rovo Chat API
      const rovoPrompt = `Analyze this Jira ticket and provide classification:

Issue: ${issueKey}
Summary: ${summary}
Description: ${description}

Please respond in JSON format with:
{
  "category": "Category name (e.g., Network & Connectivity, Hardware, Software, Account & Access)",
  "subCategory": "Subcategory (e.g., VPN, Printer, Password Reset)",
  "priority": "High/Medium/Low",
  "confidence": 0-100
}`;

      const rovoResponse = await api.asApp().requestJira(route`/gateway/api/rovo/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          agent: 'triageninja-agent',
          message: rovoPrompt
        })
      });
      
      if (rovoResponse.ok) {
        const rovoData = await rovoResponse.json();
        console.log('[runAutoTriage] Rovo Agent response received', { issueKey });
        
        // Parse Rovo response
        const aiResult = JSON.parse(rovoData.response || '{}');
        
        // Step 3: Get assignee suggestion
        const category = aiResult.category || 'General';
        const assigneeSuggestion = await suggestTicketAssignee({ issueKey, category }, context);
        
        if (!assigneeSuggestion.recommendation) {
          throw new Error('No assignee recommendation available');
        }
        
        // Step 4: Update ticket
        const newPriority = aiResult.priority || 'Medium';
        const existingLabels = ticket.fields.labels || [];
        
        console.log('[runAutoTriage] Step 3: Updating ticket with Rovo Agent results', {
          issueKey,
          category: aiResult.category,
          priority: newPriority,
          assignee: assigneeSuggestion.recommendation.displayName
        });
        
        const updateResponse = await JiraClient.updateIssue(issueKey, {
          assignee: { accountId: assigneeSuggestion.recommendation.accountId } as any,
          priority: { name: newPriority } as any,
          labels: [...new Set([...existingLabels, `category:${category}`, 'ai-triaged', 'rovo-analyzed'])]
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Failed to update ticket: ${updateResponse.error}`);
        }
        
        // Step 5: Add comment
        const commentBody = `🤖 *AI Triage Completed (Powered by Rovo Agent)*

*Analysis Results:*
• *Category:* ${aiResult.category} / ${aiResult.subCategory}
• *Priority:* ${newPriority}
• *Assigned to:* ${assigneeSuggestion.recommendation.displayName}
• *Reason:* ${assigneeSuggestion.recommendation.reasoning}
• *AI Confidence:* ${aiResult.confidence}%

_Triaged by TriageNinja with Atlassian Rovo at ${new Date().toLocaleString()}_`;
        
        await JiraClient.addComment(issueKey, commentBody);
        
        // Get top 3 candidates
        const topCandidates = assigneeSuggestion.availableAgents
          .slice(0, 3)
          .map((agent: any) => ({
            accountId: agent.accountId,
            displayName: agent.displayName,
            currentLoad: agent.currentLoad,
            reasoning: `Current workload: ${agent.currentLoad} open tickets`
          }));
        
        console.log('[runAutoTriage] Rovo Agent triage completed successfully', {
          timestamp,
          issueKey,
          category: aiResult.category,
          confidence: aiResult.confidence
        });
        
        return {
          success: true,
          result: {
            issueKey,
            category: aiResult.category,
            subCategory: aiResult.subCategory,
            priority: newPriority,
            assignee: {
              accountId: assigneeSuggestion.recommendation.accountId,
              displayName: assigneeSuggestion.recommendation.displayName
            },
            reasoning: assigneeSuggestion.recommendation.reasoning,
            confidence: aiResult.confidence,
            candidates: topCandidates,
            source: 'rovo-agent'
          }
        };
      }
    } catch (rovoError) {
      console.warn('[runAutoTriage] Rovo Agent call failed, using fallback', {
        issueKey,
        error: rovoError
      });
    }
    
    // Fallback: Use existing logic without Rovo Agent
    console.log('[runAutoTriage] Using fallback classification', { issueKey });
    
    const classification = await analyzeTicketClassification({ issueKey }, context);
    const category = classification.labels?.[0] || 'General';
    const assigneeSuggestion = await suggestTicketAssignee({ issueKey, category }, context);
    
    if (!assigneeSuggestion.recommendation) {
      throw new Error('No assignee recommendation available');
    }
    
    const priorityMap: { [key: string]: string } = {
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    };
    const newPriority = priorityMap[classification.currentPriority] || 'Medium';
    const existingLabels = ticket.fields.labels || [];
    
    const updateResponse = await JiraClient.updateIssue(issueKey, {
      assignee: { accountId: assigneeSuggestion.recommendation.accountId } as any,
      priority: { name: newPriority } as any,
      labels: [...new Set([...existingLabels, `category:${category}`, 'ai-triaged'])]
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update ticket: ${updateResponse.error}`);
    }
    
    const commentBody = `🤖 *AI Triage Completed*

*Analysis Results:*
• *Category:* ${category}
• *Priority:* ${newPriority}
• *Assigned to:* ${assigneeSuggestion.recommendation.displayName}
• *Reason:* ${assigneeSuggestion.recommendation.reasoning}

_Triaged by TriageNinja AI Agent at ${new Date().toLocaleString()}_`;
    
    await JiraClient.addComment(issueKey, commentBody);
    
    const topCandidates = assigneeSuggestion.availableAgents
      .slice(0, 3)
      .map((agent: any) => ({
        accountId: agent.accountId,
        displayName: agent.displayName,
        currentLoad: agent.currentLoad,
        reasoning: `Current workload: ${agent.currentLoad} open tickets`
      }));
    
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
        candidates: topCandidates,
        source: 'fallback'
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
