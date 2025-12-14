import { JiraClient } from '../jiraClient';
import api from '@forge/api';

// Mock @forge/api
jest.mock('@forge/api', () => ({
  __esModule: true,
  default: {
    asUser: jest.fn(() => ({
      requestJira: jest.fn()
    }))
  },
  route: jest.fn((strings: any, ...values: any[]) => {
    return strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] || ''), '');
  })
}));

describe('JiraClient', () => {
  let mockRequestJira: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestJira = jest.fn();
    (api.asUser as jest.Mock).mockReturnValue({
      requestJira: mockRequestJira
    });
  });

  describe('getIssue', () => {
    it('should fetch issue successfully', async () => {
      const mockIssue = {
        key: 'TEST-1',
        fields: {
          summary: 'Test issue',
          description: 'Test description',
          priority: { name: 'High' },
          reporter: { displayName: 'John Doe' },
          created: '2025-12-14T00:00:00.000Z'
        }
      };

      mockRequestJira.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockIssue
      });

      const result = await JiraClient.getIssue('TEST-1');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockIssue);
      expect(mockRequestJira).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockRequestJira.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessages: ['Issue not found'] })
      });

      const result = await JiraClient.getIssue('INVALID-1');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateIssue', () => {
    it('should update issue successfully', async () => {
      mockRequestJira.mockResolvedValue({
        ok: true,
        status: 204
      });

      const result = await JiraClient.updateIssue('TEST-1', {
        summary: 'Updated summary'
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(204);
      expect(mockRequestJira).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockRequestJira.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ errorMessages: ['Bad Request'] })
      });

      const result = await JiraClient.updateIssue('TEST-1', {});

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  describe('searchIssues', () => {
    it('should search issues with JQL', async () => {
      const mockResponse = {
        issues: [
          { key: 'TEST-1', fields: { summary: 'Issue 1' } },
          { key: 'TEST-2', fields: { summary: 'Issue 2' } }
        ],
        total: 2
      };

      mockRequestJira.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await JiraClient.searchIssues({
        jql: 'project = TEST',
        maxResults: 10
      });

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockRequestJira).toHaveBeenCalled();
    });
  });

  describe('getAssignableUsers', () => {
    it('should fetch assignable users for project', async () => {
      const mockUsers = [
        { accountId: 'user1', displayName: 'User 1', emailAddress: 'user1@example.com' },
        { accountId: 'user2', displayName: 'User 2', emailAddress: 'user2@example.com' }
      ];

      mockRequestJira.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUsers
      });

      const result = await JiraClient.getAssignableUsers('TEST');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(mockRequestJira).toHaveBeenCalled();
    });
  });

  describe('assignIssue', () => {
    it('should assign issue to user', async () => {
      mockRequestJira.mockResolvedValue({
        ok: true,
        status: 204
      });

      const result = await JiraClient.assignIssue('TEST-1', 'user123');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(204);
      expect(mockRequestJira).toHaveBeenCalled();
    });
  });
});
