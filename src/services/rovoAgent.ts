import api from '@forge/api';

/**
 * Rovo Agent Service
 * Handles AI-powered ticket analysis using Atlassian Rovo Agent
 */

/**
 * Input interface for ticket classification
 */
export interface ClassifyTicketInput {
  summary: string;
  description: string;
  reporter: string;
  created: string;
}

/**
 * Output interface for ticket classification
 */
export interface ClassifyTicketOutput {
  category: string;
  subCategory: string;
  priority: 'High' | 'Medium' | 'Low';
  urgency: 'Urgent' | 'Normal';
  confidence: number;
  reasoning: string;
  tags: string[];
}

/**
 * Input interface for assignee suggestion
 */
export interface SuggestAssigneeInput {
  category: string;
  subCategory: string;
  availableAgents: Array<{
    name: string;
    id: string;
    skills: string[];
    currentLoad: number;
  }>;
  historicalData: Array<{
    agent: string;
    category: string;
    avgResolutionTime: string;
    successRate: number;
  }>;
}

/**
 * Output interface for assignee suggestion
 */
export interface SuggestAssigneeOutput {
  assignee: string;
  assigneeId: string;
  reason: string;
  confidence: number;
  estimatedTime: string;
  alternatives: Array<{
    assignee: string;
    assigneeId: string;
    reason: string;
  }>;
}

/**
 * Input interface for similar ticket search
 */
export interface FindSimilarInput {
  currentTicket: {
    summary: string;
    description: string;
  };
  pastTickets: Array<{
    id: string;
    summary: string;
    description: string;
    resolution: string;
    resolutionTime: string;
  }>;
}

/**
 * Output interface for similar ticket search
 */
export interface FindSimilarOutput {
  similarTickets: Array<{
    id: string;
    similarity: number;
    solution: string;
    resolutionTime: string;
  }>;
  suggestedActions: string[];
}

/**
 * Classify a ticket using AI analysis
 * Analyzes ticket content and determines category, priority, and urgency
 */
export async function classifyTicket(input: ClassifyTicketInput): Promise<ClassifyTicketOutput> {
  const prompt = `以下のサポートチケットを分析し、適切なカテゴリー、優先度、緊急度を判定してください。

チケット情報:
- 概要: ${sanitizeForPrompt(input.summary)}
- 詳細: ${sanitizeForPrompt(input.description || 'なし')}
- 報告者: ${sanitizeForPrompt(input.reporter)}
- 作成日時: ${sanitizeForPrompt(input.created)}

カテゴリー例:
- Network & Connectivity (VPN, WiFi, Firewall)
- Hardware (PC, Printer, Monitor, Keyboard)
- Software (Application, OS, License)
- Account & Access (Password, Permissions, Login)
- Email & Communication (Outlook, Teams, Slack)
- Other (その他)

優先度の判定基準:
- High: 業務に重大な影響、多数のユーザーに影響
- Medium: 業務に影響があるが回避策あり
- Low: 軽微な問題、改善要望

緊急度の判定基準:
- Urgent: 即座の対応が必要
- Normal: 通常の対応で問題なし

以下のJSON形式で回答してください:
{
  "category": "カテゴリー名",
  "subCategory": "サブカテゴリー名",
  "priority": "High/Medium/Low",
  "urgency": "Urgent/Normal",
  "confidence": 0-100の数値,
  "reasoning": "判定理由（なぜこのカテゴリー・優先度・緊急度と判断したか）",
  "tags": ["タグ1", "タグ2"]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to classify ticket');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      category: result.category || 'Uncategorized',
      subCategory: result.subCategory || 'General',
      priority: result.priority || 'Medium',
      urgency: result.urgency || 'Normal',
      confidence: result.confidence || 50,
      reasoning: result.reasoning || 'AI analysis completed',
      tags: result.tags || []
    };
  } catch (error) {
    console.error('Error in classifyTicket:', error);
    
    // Return fallback result
    return {
      category: 'Uncategorized',
      subCategory: 'General',
      priority: 'Medium',
      urgency: 'Normal',
      confidence: 0,
      reasoning: 'AI analysis failed, manual triage required',
      tags: []
    };
  }
}

/**
 * Sanitize data for prompt to prevent injection attacks
 */
function sanitizeForPrompt(data: any): string {
  if (typeof data === 'string') {
    return data.replace(/[\\"`]/g, '\\$&').substring(0, 500);
  }
  return JSON.stringify(data).substring(0, 1000);
}

/**
 * Escape string for safe embedding in GraphQL query
 * Handles all special characters that could break GraphQL syntax
 */
function escapeGraphQL(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/"/g, '\\"')      // Double quote
    .replace(/\n/g, '\\n')     // Newline
    .replace(/\r/g, '\\r')     // Carriage return
    .replace(/\t/g, '\\t')     // Tab
    .replace(/\f/g, '\\f')     // Form feed
    .replace(/\b/g, '\\b')     // Backspace
    .replace(/\u0000/g, '')    // Null character (remove)
    .replace(/[\u0001-\u001F\u007F-\u009F]/g, ''); // Control characters (remove)
}

/**
 * Suggest the best assignee for a ticket
 * Analyzes agent skills and workload to recommend optimal assignment
 */
export async function suggestAssignee(input: SuggestAssigneeInput): Promise<SuggestAssigneeOutput> {
  // Format available agents in a safe, readable way
  const formattedAgents = input.availableAgents
    .map((agent, index) => 
      `${index + 1}. ${sanitizeForPrompt(agent.name)} (ID: ${sanitizeForPrompt(agent.id)})
   現在の負荷: ${agent.currentLoad}件`
    )
    .join('\n');

  // Format historical data in a safe, readable way
  const formattedHistory = input.historicalData
    .map((data, index) => 
      `${index + 1}. ${sanitizeForPrompt(data.agent)}
   カテゴリー: ${sanitizeForPrompt(data.category)}
   平均解決時間: ${sanitizeForPrompt(data.avgResolutionTime)}
   成功率: ${data.successRate * 100}%`
    )
    .join('\n');

  const prompt = `以下の情報を基に、最適な担当者を選定してください:

カテゴリー: ${sanitizeForPrompt(input.category)}
サブカテゴリー: ${sanitizeForPrompt(input.subCategory)}

利用可能な担当者:
${formattedAgents}

過去の実績:
${formattedHistory}

JSON形式で回答:
{
  "assignee": "担当者名",
  "assigneeId": "担当者ID",
  "reason": "選定理由",
  "confidence": 0-100,
  "estimatedTime": "推定解決時間",
  "alternatives": [
    {
      "assignee": "代替担当者名",
      "assigneeId": "代替担当者ID",
      "reason": "理由"
    }
  ]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to suggest assignee');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      assignee: result.assignee || 'Unassigned',
      assigneeId: result.assigneeId || '',
      reason: result.reason || 'No specific reason',
      confidence: result.confidence || 50,
      estimatedTime: result.estimatedTime || 'Unknown',
      alternatives: result.alternatives || []
    };
  } catch (error) {
    console.error('Error in suggestAssignee:', error);
    
    // Return fallback result
    return {
      assignee: 'Unassigned',
      assigneeId: '',
      reason: 'AI analysis failed, manual assignment required',
      confidence: 0,
      estimatedTime: 'Unknown',
      alternatives: []
    };
  }
}

/**
 * Find similar tickets based on content analysis
 * Uses AI to identify semantically similar past tickets
 */
export async function findSimilarTickets(input: FindSimilarInput): Promise<FindSimilarOutput> {
  // Format past tickets in a more readable way for the AI with sanitization
  const formattedPastTickets = input.pastTickets
    .map((ticket, index) => 
      `${index + 1}. ${sanitizeForPrompt(ticket.id)}
   概要: ${sanitizeForPrompt(ticket.summary)}
   詳細: ${sanitizeForPrompt(ticket.description.substring(0, 200))}${ticket.description.length > 200 ? '...' : ''}
   解決方法: ${sanitizeForPrompt(ticket.resolution)}
   解決時間: ${sanitizeForPrompt(ticket.resolutionTime)}`
    )
    .join('\n\n');

  const prompt = `以下の現在のチケットに類似する過去のチケットを分析し、
最も関連性の高いものを上位3件選定してください:

現在のチケット:
- 概要: ${sanitizeForPrompt(input.currentTicket.summary)}
- 詳細: ${sanitizeForPrompt(input.currentTicket.description || 'なし')}

過去のチケット:
${formattedPastTickets}

JSON形式で回答:
{
  "similarTickets": [
    {
      "id": "チケットID",
      "similarity": 0-1の数値,
      "solution": "解決方法の要約",
      "resolutionTime": "解決時間"
    }
  ],
  "suggestedActions": [
    "推奨アクション1",
    "推奨アクション2"
  ]
}`;

  try {
    // Call Rovo Agent API with properly escaped prompt
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${escapeGraphQL(prompt)}"
          }) {
            response
          }
        }
      }
    `);

    if (!response.ok) {
      console.error('Rovo Agent API error:', response.status, await response.text());
      throw new Error('Failed to find similar tickets');
    }

    const data = await response.json();
    const aiResponse = data.data?.ai?.chat?.response;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse, parseError);
      throw new Error('AI response was not valid JSON');
    }
    
    return {
      similarTickets: result.similarTickets || [],
      suggestedActions: result.suggestedActions || []
    };
  } catch (error) {
    console.error('Error in findSimilarTickets:', error);
    
    // Return fallback result
    return {
      similarTickets: [],
      suggestedActions: ['AI analysis failed, manual review recommended']
    };
  }
}
