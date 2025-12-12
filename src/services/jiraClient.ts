/**
 * Jira API Client
 * Wrapper for Jira REST API v3 calls with error handling
 */

import api, { route } from '@forge/api';
import {
  JiraIssue,
  JiraSearchResult,
  JiraSearchRequest,
  JiraUser,
  ApiResponse,
  JiraErrorResponse,
} from '../types/jira';

/**
 * Jira API Client Class
 * Provides methods to interact with Jira REST API v3
 */
export class JiraClient {
  /**
   * Fetch a single issue by key or ID
   * @param issueIdOrKey - Issue key (e.g., "HELP-123") or ID
   * @param fields - Optional array of fields to retrieve
   * @returns Promise with issue data or error
   */
  static async getIssue(
    issueIdOrKey: string,
    fields?: string[]
  ): Promise<ApiResponse<JiraIssue>> {
    try {
      const fieldsParam = fields ? `?fields=${fields.join(',')}` : '';
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/issue/${issueIdOrKey}${fieldsParam}`);

      if (!response.ok) {
        const errorData: JiraErrorResponse = await response.json();
        return {
          error: errorData,
          status: response.status,
          ok: false,
        };
      }

      const data: JiraIssue = await response.json();
      return {
        data,
        status: response.status,
        ok: true,
      };
    } catch (error) {
      console.error('Failed to fetch issue:', error);
      return {
        error: {
          errorMessages: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
        },
        status: 500,
        ok: false,
      };
    }
  }

  /**
   * Search for issues using JQL
   * @param searchRequest - Search parameters including JQL query
   * @returns Promise with search results or error
   */
  static async searchIssues(
    searchRequest: JiraSearchRequest
  ): Promise<ApiResponse<JiraSearchResult>> {
    try {
      const response = await api.asUser().requestJira(route`/rest/api/3/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
      });

      if (!response.ok) {
        const errorData: JiraErrorResponse = await response.json();
        return {
          error: errorData,
          status: response.status,
          ok: false,
        };
      }

      const data: JiraSearchResult = await response.json();
      return {
        data,
        status: response.status,
        ok: true,
      };
    } catch (error) {
      console.error('Failed to search issues:', error);
      return {
        error: {
          errorMessages: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
        },
        status: 500,
        ok: false,
      };
    }
  }

  /**
   * Get assignable users for a project
   * @param projectKey - Project key (e.g., "HELP")
   * @param maxResults - Maximum number of results (default: 50)
   * @returns Promise with user list or error
   */
  static async getAssignableUsers(
    projectKey: string,
    maxResults: number = 50
  ): Promise<ApiResponse<JiraUser[]>> {
    try {
      const response = await api
        .asUser()
        .requestJira(
          route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=${maxResults}`
        );

      if (!response.ok) {
        const errorData: JiraErrorResponse = await response.json();
        return {
          error: errorData,
          status: response.status,
          ok: false,
        };
      }

      const data: JiraUser[] = await response.json();
      return {
        data,
        status: response.status,
        ok: true,
      };
    } catch (error) {
      console.error('Failed to fetch assignable users:', error);
      return {
        error: {
          errorMessages: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
        },
        status: 500,
        ok: false,
      };
    }
  }

  /**
   * Update an issue
   * @param issueIdOrKey - Issue key or ID
   * @param fields - Fields to update
   * @returns Promise with success status or error
   */
  static async updateIssue(
    issueIdOrKey: string,
    fields: Partial<JiraIssue['fields']>
  ): Promise<ApiResponse<void>> {
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        });

      if (!response.ok) {
        const errorData: JiraErrorResponse = await response.json();
        return {
          error: errorData,
          status: response.status,
          ok: false,
        };
      }

      return {
        status: response.status,
        ok: true,
      };
    } catch (error) {
      console.error('Failed to update issue:', error);
      return {
        error: {
          errorMessages: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
        },
        status: 500,
        ok: false,
      };
    }
  }

  /**
   * Assign an issue to a user
   * @param issueIdOrKey - Issue key or ID
   * @param accountId - User account ID
   * @returns Promise with success status or error
   */
  static async assignIssue(
    issueIdOrKey: string,
    accountId: string
  ): Promise<ApiResponse<void>> {
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/issue/${issueIdOrKey}/assignee`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId }),
        });

      if (!response.ok) {
        const errorData: JiraErrorResponse = await response.json();
        return {
          error: errorData,
          status: response.status,
          ok: false,
        };
      }

      return {
        status: response.status,
        ok: true,
      };
    } catch (error) {
      console.error('Failed to assign issue:', error);
      return {
        error: {
          errorMessages: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
        },
        status: 500,
        ok: false,
      };
    }
  }
}
