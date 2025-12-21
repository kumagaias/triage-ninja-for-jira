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
  JiraIssueFields,
} from '../types/jira';

/**
 * Jira API Client Class
 * Provides methods to interact with Jira REST API v3
 */
export class JiraClient {
  /**
   * Handle API response and convert to ApiResponse format
   * @param response - Fetch response object from @forge/api
   * @returns Promise with typed API response
   */
  private static async handleResponse<T>(
    response: any
  ): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData as JiraErrorResponse,
        status: response.status,
        ok: false,
      };
    }

    const data = await response.json();
    return {
      data: data as T,
      status: response.status,
      ok: true,
    };
  }

  /**
   * Handle API errors in catch blocks
   * @param error - Error object
   * @param methodName - Name of the method that failed
   * @returns ApiResponse with error information
   */
  private static handleApiError<T>(
    error: unknown,
    methodName: string
  ): ApiResponse<T> {
    console.error(`Failed to ${methodName}:`, error);
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
      // Use route template with direct parameter interpolation
      // Query parameters must be added separately to avoid path manipulation errors
      let response;
      if (fields && fields.length > 0) {
        response = await api
          .asUser()
          .requestJira(route`/rest/api/3/issue/${issueIdOrKey}?fields=${fields.join(',')}`);
      } else {
        response = await api
          .asUser()
          .requestJira(route`/rest/api/3/issue/${issueIdOrKey}`);
      }

      return this.handleResponse<JiraIssue>(response);
    } catch (error) {
      return this.handleApiError<JiraIssue>(error, 'fetch issue');
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
      // Use the new /rest/api/3/search/jql endpoint (replaces deprecated /rest/api/3/search)
      const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
      });

      return this.handleResponse<JiraSearchResult>(response);
    } catch (error) {
      return this.handleApiError<JiraSearchResult>(error, 'search issues');
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
      // Use route template with direct parameter interpolation
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=${maxResults}`);

      return this.handleResponse<JiraUser[]>(response);
    } catch (error) {
      return this.handleApiError<JiraUser[]>(error, 'fetch assignable users');
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
    fields: Partial<JiraIssueFields>
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
      return this.handleApiError<void>(error, 'update issue');
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
      return this.handleApiError<void>(error, 'assign issue');
    }
  }

  /**
   * Create a new issue
   * @param issueData - Issue creation data
   * @returns Promise with created issue data or error
   */
  static async createIssue(
    issueData: { fields: any }
  ): Promise<ApiResponse<{ key: string; id: string }>> {
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issueData),
        });

      return this.handleResponse<{ key: string; id: string }>(response);
    } catch (error) {
      return this.handleApiError<{ key: string; id: string }>(error, 'create issue');
    }
  }

  /**
   * Add a comment to an issue
   * @param issueIdOrKey - Issue key or ID
   * @param commentBody - Comment text (supports Jira markdown)
   * @returns Promise with success status or error
   */
  static async addComment(
    issueIdOrKey: string,
    commentBody: string
  ): Promise<ApiResponse<void>> {
    try {
      const response = await api
        .asUser()
        .requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: commentBody
                    }
                  ]
                }
              ]
            }
          }),
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
      return this.handleApiError<void>(error, 'add comment');
    }
  }
}
