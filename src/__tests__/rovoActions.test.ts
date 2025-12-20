/**
 * Unit tests for Rovo Actions
 * Tests validation, error handling, and data structure for all three Rovo Actions
 */

import { analyzeTicketClassification, suggestTicketAssignee, findSimilarTickets } from '../index';
import { JiraClient } from '../services/jiraClient';

// Mock JiraClient
jest.mock('../services/jiraClient');

describe('Rovo Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeTicketClassification', () => {
    const mockContext = { accountId: 'test-account-id' };

    it('should return structured ticket data for valid input', async () => {
      const mockTicketData = {
        key: 'SUP-123',
        fields: {
          summary: 'Cannot connect to VPN',
          description: 'I am unable to connect to the company VPN',
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
        data: mockTicketData
      });

      const result = await analyzeTicketClassification(
        { issueKey: 'SUP-123' },
        mockContext
      );

      expect(result).toHaveProperty('issueKey', 'SUP-123');
      expect(result).toHaveProperty('summary', 'Cannot connect to VPN');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('reporter', 'John Doe');
      expect(result).toHaveProperty('reporterEmail', 'john@example.com');
      expect(result).toHaveProperty('context');
      expect(result.context).toHaveProperty('hasDescription', true);
      expect(result.context).toHaveProperty('descriptionLength');
      expect(result.context).toHaveProperty('summaryLength');
    });

    it('should throw error for missing issueKey', async () => {
      await expect(
        analyzeTicketClassification({}, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should throw error for invalid issueKey type', async () => {
      await expect(
        analyzeTicketClassification({ issueKey: 123 }, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should throw error for invalid context', async () => {
      await expect(
        analyzeTicketClassification({ issueKey: 'SUP-123' }, null)
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should handle Jira API failure gracefully', async () => {
      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'API Error'
      });

      await expect(
        analyzeTicketClassification({ issueKey: 'SUP-123' }, mockContext)
      ).rejects.toThrow('Failed to fetch ticket data');
    });

    it('should handle missing optional fields', async () => {
      const mockTicketData = {
        key: 'SUP-123',
        fields: {
          summary: 'Test ticket',
          description: null,
          reporter: null,
          created: '2025-12-20T10:00:00Z',
          priority: null,
          status: null,
          labels: []
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockTicketData
      });

      const result = await analyzeTicketClassification(
        { issueKey: 'SUP-123' },
        mockContext
      );

      expect(result.description).toBe('');
      expect(result.reporter).toBe('Unknown');
      expect(result.reporterEmail).toBe('');
      expect(result.currentPriority).toBe('None');
      expect(result.currentStatus).toBe('Unknown');
    });
  });

  describe('suggestTicketAssignee', () => {
    const mockContext = { accountId: 'test-account-id' };

    it('should return agent data with workload for valid input', async () => {
      const mockIssueData = {
        key: 'SUP-123',
        fields: {
          project: { key: 'SUP' }
        }
      };

      const mockUsers = [
        {
          accountId: 'user-1',
          displayName: 'Jane Smith',
          emailAddress: 'jane@example.com',
          active: true
        },
        {
          accountId: 'user-2',
          displayName: 'Bob Johnson',
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
        .mockResolvedValueOnce({
          ok: true,
          data: { issues: [{}, {}, {}] } // 3 tickets for user-1
        })
        .mockResolvedValueOnce({
          ok: true,
          data: { issues: [{}] } // 1 ticket for user-2
        });

      const result = await suggestTicketAssignee(
        { issueKey: 'SUP-123', category: 'Network & Connectivity' },
        mockContext
      );

      expect(result).toHaveProperty('issueKey', 'SUP-123');
      expect(result).toHaveProperty('category', 'Network & Connectivity');
      expect(result).toHaveProperty('projectKey', 'SUP');
      expect(result).toHaveProperty('availableAgents');
      expect(result.availableAgents).toHaveLength(2);
      expect(result.availableAgents[0]).toHaveProperty('currentLoad');
      expect(result).toHaveProperty('recommendation');
      expect(result.recommendation?.currentLoad).toBe(1); // Lowest workload
    });

    it('should throw error for missing issueKey', async () => {
      await expect(
        suggestTicketAssignee({ category: 'Network' }, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should throw error for missing category', async () => {
      await expect(
        suggestTicketAssignee({ issueKey: 'SUP-123' }, mockContext)
      ).rejects.toThrow('Invalid input: category is required and must be a string');
    });

    it('should throw error for invalid context', async () => {
      await expect(
        suggestTicketAssignee(
          { issueKey: 'SUP-123', category: 'Network' },
          null
        )
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should handle no available users', async () => {
      const mockIssueData = {
        key: 'SUP-123',
        fields: {
          project: { key: 'SUP' }
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockIssueData
      });

      (JiraClient.getAssignableUsers as jest.Mock).mockResolvedValue({
        ok: true,
        data: []
      });

      const result = await suggestTicketAssignee(
        { issueKey: 'SUP-123', category: 'Network' },
        mockContext
      );

      expect(result.availableAgents).toHaveLength(0);
      expect(result.recommendation).toBeNull();
    });
  });

  describe('findSimilarTickets', () => {
    const mockContext = { accountId: 'test-account-id' };

    it('should return similar tickets for valid input', async () => {
      const mockCurrentTicket = {
        key: 'SUP-123',
        fields: {
          summary: 'Cannot connect to VPN from home',
          description: 'I am unable to connect to the company VPN',
          project: { key: 'SUP' }
        }
      };

      const mockSimilarTickets = {
        issues: [
          {
            key: 'SUP-100',
            fields: {
              summary: 'VPN connection issues',
              description: 'Similar VPN problem',
              resolution: { name: 'Fixed' },
              resolutiondate: '2025-12-15T10:00:00Z',
              created: '2025-12-10T10:00:00Z',
              assignee: { displayName: 'John Doe' },
              status: { name: 'Done' }
            }
          }
        ]
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockCurrentTicket
      });

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockSimilarTickets
      });

      const result = await findSimilarTickets(
        { issueKey: 'SUP-123' },
        mockContext
      );

      expect(result).toHaveProperty('issueKey', 'SUP-123');
      expect(result).toHaveProperty('currentTicket');
      expect(result.currentTicket).toHaveProperty('summary');
      expect(result.currentTicket).toHaveProperty('projectKey', 'SUP');
      expect(result).toHaveProperty('similarTickets');
      expect(result.similarTickets).toHaveLength(1);
      expect(result.similarTickets[0]).toHaveProperty('similarityScore');
      expect(result).toHaveProperty('searchKeywords');
    });

    it('should throw error for missing issueKey', async () => {
      await expect(
        findSimilarTickets({}, mockContext)
      ).rejects.toThrow('Invalid input: issueKey is required and must be a string');
    });

    it('should throw error for invalid context', async () => {
      await expect(
        findSimilarTickets({ issueKey: 'SUP-123' }, null)
      ).rejects.toThrow('Invalid context: context object is required');
    });

    it('should handle no similar tickets found', async () => {
      const mockCurrentTicket = {
        key: 'SUP-123',
        fields: {
          summary: 'Unique issue',
          description: 'Very unique problem',
          project: { key: 'SUP' }
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockCurrentTicket
      });

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue({
        ok: true,
        data: { issues: [] }
      });

      const result = await findSimilarTickets(
        { issueKey: 'SUP-123' },
        mockContext
      );

      expect(result.similarTickets).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('should handle short summary with no valid keywords', async () => {
      const mockCurrentTicket = {
        key: 'SUP-123',
        fields: {
          summary: 'Hi',
          description: 'Help',
          project: { key: 'SUP' }
        }
      };

      (JiraClient.getIssue as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockCurrentTicket
      });

      const result = await findSimilarTickets(
        { issueKey: 'SUP-123' },
        mockContext
      );

      expect(result.searchKeywords).toBe('');
      expect(result.similarTickets).toHaveLength(0);
    });
  });
});
