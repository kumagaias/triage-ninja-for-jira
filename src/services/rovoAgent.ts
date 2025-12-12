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
- 概要: ${input.summary}
- 詳細: ${input.description || 'なし'}
- 報告者: ${input.reporter}
- 作成日時: ${input.created}

以下のJSON形式で回答してください:
{
  "category": "カテゴリー名",
  "subCategory": "サブカテゴリー名",
  "priority": "High/Medium/Low",
  "urgency": "Urgent/Normal",
  "confidence": 0-100の数値,
  "reasoning": "判定理由",
  "tags": ["タグ1", "タグ2"]
}`;

  try {
    // Call Rovo Agent API
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
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

    // Parse AI response
    const result = JSON.parse(aiResponse);
    
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
 * Suggest the best assignee for a ticket
 * Analyzes agent skills and workload to recommend optimal assignment
 */
export async function suggestAssignee(input: SuggestAssigneeInput): Promise<SuggestAssigneeOutput> {
  const prompt = `以下の情報を基に、最適な担当者を選定してください:

カテゴリー: ${input.category}
サブカテゴリー: ${input.subCategory}
利用可能な担当者: ${JSON.stringify(input.availableAgents)}
過去の実績: ${JSON.stringify(input.historicalData)}

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
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
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

    const result = JSON.parse(aiResponse);
    
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
  const prompt = `以下の現在のチケットに類似する過去のチケットを分析し、
最も関連性の高いものを選定してください:

現在のチケット:
- 概要: ${input.currentTicket.summary}
- 詳細: ${input.currentTicket.description || 'なし'}

過去のチケット:
${JSON.stringify(input.pastTickets)}

JSON形式で回答:
{
  "similarTickets": [
    {
      "id": "チケットID",
      "similarity": 0-1の数値,
      "solution": "解決方法",
      "resolutionTime": "解決時間"
    }
  ],
  "suggestedActions": [
    "推奨アクション1",
    "推奨アクション2"
  ]
}`;

  try {
    const response = await api.asApp().requestGraph(`
      query {
        ai {
          chat(input: {
            prompt: "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
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

    const result = JSON.parse(aiResponse);
    
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
