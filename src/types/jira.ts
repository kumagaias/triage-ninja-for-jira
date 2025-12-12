/**
 * Jira API Type Definitions
 * Based on Jira REST API v3
 */

/**
 * Jira Issue Type
 */
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

/**
 * Jira Issue Fields
 */
export interface JiraIssueFields {
  summary: string;
  description?: string | null;
  priority?: JiraPriority | null;
  status?: JiraStatus | null;
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  created: string;
  updated: string;
  labels?: string[];
  [key: string]: any; // Allow custom fields
}

/**
 * Jira Priority
 */
export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

/**
 * Jira Status
 */
export interface JiraStatus {
  id: string;
  name: string;
  statusCategory?: {
    id: number;
    key: string;
    name: string;
  };
}

/**
 * Jira User
 */
export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    '48x48'?: string;
    '24x24'?: string;
    '16x16'?: string;
    '32x32'?: string;
  };
  active: boolean;
}

/**
 * Jira Search Result
 */
export interface JiraSearchResult {
  expand?: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

/**
 * Jira Search Request
 */
export interface JiraSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}

/**
 * Jira API Error Response
 */
export interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: {
    [key: string]: string;
  };
}

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * API Response
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: JiraErrorResponse;
  status: number;
  ok: boolean;
}
