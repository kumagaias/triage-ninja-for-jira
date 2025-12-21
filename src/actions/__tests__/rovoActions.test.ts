import {
  analyzeTicketClassification,
  suggestTicketAssignee,
  findSimilarTickets
} from '../rovoActions';
import { JiraClient } from '../../services/jiraClient';

// Mock JiraClient
jest.mock('../../services/jiraClient');

describe('rovoActions', () => {
  const mockContext = { accountId: 'test-user-123' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeTicketClassification', () => {
    it('should return structured ticket data', async () => {
      const mockIssueData = {
        key: 'TEST-123',
        fields: {
          summary: 'Cannot connect to VPN',
          description: 'VPN connection fails with authentication error',
          reporter: {
            displayName: 'John Doe',
            emailAddress: 'john@example.com'
          },
          created: '2025-12-20T10:00:00Z',
          priority: { name: 'High' },
          status: { name: 'Open' },
          labels: ['network', 'vpn']
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockIssueData
      });

      const result = await analyzeTicketClassification(
        { issueKey: 'TEST-123' },
        mockContext
      );

      expect(result).toMatchObject({
        issueKey: 'TEST-123',
        summary: 'Cannot connect to VPN',
        description: 'VPN connection fails with authentication error',
        reporter: 'John Doe',
        reporterEmail: 'john@example.com',
        currentPriority: 'High',
        currentStatus: 'Open',
        labels: ['network', 'vpn']
      });
      expect(result.context).toHaveProperty('hasDescription', true);
      expect(result.context).toHaveProperty('descriptionLength');
      expect(result.context).toHaveProperty('summaryLength');
      expect(result.context).toHaveProperty('age');
    });

    it('should throw error when context is invalid', async () => {
      await expect(
        analyzeTicketClassification({ issueKey: 'TEST-123' }, null)
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should throw error when issueKey is missing', async () => {
      await expect(
        analyzeTicketClassification({}, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should throw error when Jira API fails', async () => {
      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'API error'
      });

      await expect(
        analyzeTicketClassification({ issueKey: 'TEST-123' }, mockContext)
      ).rejects.toThrow('Failed to analyze ticket classification');
    });
  });

  describe('suggestTicketAssignee', () => {
    it('should return available agents with workload', async () => {
      const mockIssueData = {
        fields: {
          project: { key: 'TEST' }
        }
      };

      const mockUsers = [
        {
          accountId: 'user1',
          displayName: 'Alice',
          emailAddress: 'alice@example.com',
          active: true
        },
        {
          accountId: 'user2',
          displayName: 'Bob',
          emailAddress: 'bob@example.com',
          active: true
        }
      ];

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockIssueData
      });

      (JiraClient.getAssignableUsers as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockUsers
      });

      (JiraClient.searchIssues as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { issues: [{ key: 'T-1' }, { key: 'T-2' }] } })
        .mockResolvedValueOnce({ ok: true, data: { issues: [{ key: 'T-3' }] } });

      const result = await suggestTicketAssignee(
        { issueKey: 'TEST-123', category: 'Network' },
        mockContext
      );

      expect(result).toMatchObject({
        issueKey: 'TEST-123',
        category: 'Network',
        projectKey: 'TEST',
        totalAgents: 2
      });
      expect(result.availableAgents).toHaveLength(2);
      expect(result.availableAgents[0].currentLoad).toBeLessThanOrEqual(result.availableAgents[1].currentLoad);
      expect(result.recommendation).toBeDefined();
    });

    it('should throw error when context is invalid', async () => {
      await expect(
        suggestTicketAssignee({ issueKey: 'TEST-123', category: 'Network' }, null)
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should throw error when category is missing', async () => {
      await expect(
        suggestTicketAssignee({ issueKey: 'TEST-123' }, mockContext)
      ).rejects.toThrow('Invalid input: category is required and must be a string');
    });
  });

  describe('findSimilarTickets', () => {
    it('should return similar tickets with similarity scores', async () => {
      const mockCurrentTicket = {
        key: 'TEST-123',
        fields: {
          project: { key: 'TEST' },
          summary: 'VPN connection problem',
          description: 'Cannot connect to VPN from home'
        }
      };

      const mockSimilarTickets = [
        {
          key: 'TEST-100',
          fields: {
            summary: 'VPN authentication failed',
            description: 'VPN connection issues',
            resolution: { name: 'Fixed' },
            resolutiondate: '2025-12-15T10:00:00Z',
            created: '2025-12-14T10:00:00Z',
            assignee: { displayName: 'Jane' },
            status: { name: 'Done' }
          }
        }
      ];

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockCurrentTicket
      });

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue({
        ok: true,
        data: { issues: mockSimilarTickets }
      });

      const result = await findSimilarTickets(
        { issueKey: 'TEST-123' },
        mockContext
      );

      expect(result).toMatchObject({
        issueKey: 'TEST-123',
        totalFound: 1
      });
      expect(result.currentTicket).toHaveProperty('summary');
      expect(result.similarTickets).toHaveLength(1);
      expect(result.similarTickets[0]).toHaveProperty('similarityScore');
      expect(result.searchKeywords).toBeTruthy();
    });

    it('should throw error when context is invalid', async () => {
      await expect(
        findSimilarTickets({ issueKey: 'TEST-123' }, null)
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should throw error when issueKey is missing', async () => {
      await expect(
        findSimilarTickets({}, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should return empty array when no keywords can be extracted', async () => {
      const mockCurrentTicket = {
        key: 'TEST-123',
        fields: {
          project: { key: 'TEST' },
          summary: 'ab',
          description: ''
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockCurrentTicket
      });

      const result = await findSimilarTickets(
        { issueKey: 'TEST-123' },
        mockContext
      );

      expect(result.similarTickets).toHaveLength(0);
      expect(result.searchKeywords).toBe('');
    });
  });
});
