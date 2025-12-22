/**
 * Forge LLM-based Triage Service
 * Uses Atlassian-hosted LLMs for ticket classification and assignment
 */

import { chat } from '@forge/llm';

interface TicketData {
  issueKey: string;
  summary: string;
  description: string;
  reporter: string;
  created: string;
}

interface ClassificationResult {
  category: string;
  subCategory: string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  urgency: 'Urgent' | 'Normal';
  confidence: number;
  reasoning: string;
}

interface AssigneeSuggestion {
  assignee: {
    id: string;
    name: string;
  } | null;
  reason: string;
  confidence: number;
}

interface ProjectMember {
  accountId: string;
  displayName: string;
  ticketCount: number;
}

/**
 * Classify a ticket using Forge LLM
 */
export async function classifyTicketWithLLM(
  ticketData: TicketData
): Promise<ClassificationResult> {
  console.log('[forgeLlmTriage] Classifying ticket with Forge LLM:', ticketData.issueKey);

  const prompt = `You are an expert Jira ticket triage assistant. Analyze the following ticket and classify it.

Ticket Information:
- Key: ${ticketData.issueKey}
- Summary: ${ticketData.summary}
- Description: ${ticketData.description || 'No description provided'}
- Reporter: ${ticketData.reporter}
- Created: ${ticketData.created}

Categories and Subcategories:
1. Network Issues
   - Connectivity, VPN, Wi-Fi, DNS, Firewall
2. Hardware Issues
   - Desktop, Laptop, Printer, Monitor, Peripherals
3. Software Issues
   - Application Error, Installation, License, Performance
4. Account & Access
   - Password Reset, Permissions, New Account, Account Locked
5. Email & Communication
   - Email Access, Distribution List, Calendar, Teams/Slack
6. Security
   - Malware, Phishing, Data Breach, Security Policy
7. Data & Storage
   - File Recovery, Backup, Storage Space, Database
8. Other
   - General Inquiry, Documentation, Training

Priority Guidelines:
- Highest: System down, security breach, data loss
- High: Major functionality broken, multiple users affected
- Medium: Single user issue, workaround available
- Low: Minor issue, cosmetic problem
- Lowest: Enhancement request, documentation

Urgency Guidelines:
- Urgent: Immediate action required, business critical
- Normal: Standard processing time acceptable

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "category": "category name",
  "subCategory": "subcategory name",
  "priority": "Highest|High|Medium|Low|Lowest",
  "urgency": "Urgent|Normal",
  "confidence": 85,
  "reasoning": "Brief explanation of classification"
}`;

  try {
    const response = await chat({
      model: 'claude-3-5-haiku-20241022', // Fast and cost-effective for classification
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent classification
      max_completion_tokens: 500
    });

    console.log('[forgeLlmTriage] LLM response received');

    // Extract the response content
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    // Parse the JSON response
    const textContent = typeof content === 'string' ? content : content[0]?.text;
    if (!textContent) {
      throw new Error('Could not extract text from LLM response');
    }

    // Clean up the response (remove markdown code blocks if present)
    const cleanedText = textContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result: ClassificationResult = JSON.parse(cleanedText);

    console.log('[forgeLlmTriage] Classification result:', {
      category: result.category,
      priority: result.priority,
      confidence: result.confidence
    });

    // Log token usage if available
    if (response.usage) {
      console.log('[forgeLlmTriage] Token usage:', response.usage);
    }

    return result;
  } catch (error) {
    console.error('[forgeLlmTriage] Classification failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM classification failed: ${errorMessage}`);
  }
}

/**
 * Suggest an assignee using Forge LLM
 */
export async function suggestAssigneeWithLLM(
  ticketData: TicketData,
  classification: ClassificationResult,
  projectMembers: ProjectMember[]
): Promise<AssigneeSuggestion> {
  console.log('[forgeLlmTriage] Suggesting assignee with Forge LLM');

  // Filter out members with very high workload (more than 10 tickets)
  const availableMembers = projectMembers.filter(m => m.ticketCount < 10);

  if (availableMembers.length === 0) {
    console.log('[forgeLlmTriage] No available members, returning null assignee');
    return {
      assignee: null,
      reason: 'All team members are at capacity',
      confidence: 0
    };
  }

  const membersInfo = availableMembers
    .map(m => `- ${m.displayName} (ID: ${m.accountId}, Current tickets: ${m.ticketCount})`)
    .join('\n');

  const prompt = `You are an expert at assigning Jira tickets to team members. Based on the ticket classification and team workload, suggest the best assignee.

Ticket Information:
- Key: ${ticketData.issueKey}
- Summary: ${ticketData.summary}
- Category: ${classification.category} / ${classification.subCategory}
- Priority: ${classification.priority}
- Urgency: ${classification.urgency}

Available Team Members:
${membersInfo}

Assignment Guidelines:
1. Balance workload - prefer members with fewer current tickets
2. Consider category expertise (if member names suggest specialization)
3. For urgent/high priority tickets, prefer members with lower workload
4. If all members have similar workload, distribute evenly

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "assigneeId": "account-id-here or null",
  "assigneeName": "member name or null",
  "reason": "Brief explanation of why this member was chosen",
  "confidence": 75
}`;

  try {
    const response = await chat({
      model: 'claude-3-5-haiku-20241022',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 300
    });

    console.log('[forgeLlmTriage] Assignee suggestion received');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    const textContent = typeof content === 'string' ? content : content[0]?.text;
    if (!textContent) {
      throw new Error('Could not extract text from LLM response');
    }

    const cleanedText = textContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(cleanedText);

    console.log('[forgeLlmTriage] Assignee suggestion:', {
      assignee: result.assigneeName,
      confidence: result.confidence
    });

    if (response.usage) {
      console.log('[forgeLlmTriage] Token usage:', response.usage);
    }

    return {
      assignee: result.assigneeId ? {
        id: result.assigneeId,
        name: result.assigneeName
      } : null,
      reason: result.reason,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('[forgeLlmTriage] Assignee suggestion failed:', error);
    
    // Fallback: suggest member with lowest workload
    const lowestWorkload = availableMembers.sort((a, b) => a.ticketCount - b.ticketCount)[0];
    return {
      assignee: {
        id: lowestWorkload.accountId,
        name: lowestWorkload.displayName
      },
      reason: 'Assigned to member with lowest workload (LLM fallback)',
      confidence: 50
    };
  }
}

/**
 * Complete triage using Forge LLM
 * Combines classification and assignee suggestion
 */
export async function performCompleteTriage(
  ticketData: TicketData,
  projectMembers: ProjectMember[]
) {
  console.log('[forgeLlmTriage] Starting complete triage for:', ticketData.issueKey);

  try {
    // Step 1: Classify the ticket
    const classification = await classifyTicketWithLLM(ticketData);

    // Step 2: Suggest an assignee
    const assigneeSuggestion = await suggestAssigneeWithLLM(
      ticketData,
      classification,
      projectMembers
    );

    const result = {
      category: classification.category,
      subCategory: classification.subCategory,
      priority: classification.priority,
      urgency: classification.urgency,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      suggestedAssignee: assigneeSuggestion.assignee,
      assigneeReason: assigneeSuggestion.reason,
      assigneeConfidence: assigneeSuggestion.confidence,
      source: 'forge-llm'
    };

    console.log('[forgeLlmTriage] Complete triage finished:', {
      category: result.category,
      priority: result.priority,
      assignee: result.suggestedAssignee?.name || 'None'
    });

    return result;
  } catch (error) {
    console.error('[forgeLlmTriage] Complete triage failed:', error);
    throw error;
  }
}
