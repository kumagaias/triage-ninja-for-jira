import { calculateUserWorkload, escapeJqlText } from '../helpers';
import { JiraClient } from '../../services/jiraClient';

// Mock JiraClient
jest.mock('../../services/jiraClient');

describe('helpers', () => {
  describe('calculateUserWorkload', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the count of open tickets for a user', async () => {
      const mockResponse = {
        ok: true,
        data: {
          issues: [
            { key: 'TEST-1' },
            { key: 'TEST-2' },
            { key: 'TEST-3' }
          ]
        }
      };

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue(mockResponse);

      const result = await calculateUserWorkload('user123', 'TEST');

      expect(result).toBe(3);
      expect(JiraClient.searchIssues).toHaveBeenCalledWith({
        jql: 'project = TEST AND assignee = "user123" AND statusCategory != Done',
        maxResults: 100,
        fields: ['key']
      });
    });

    it('should return 0 when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        error: 'API error'
      };

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue(mockResponse);

      const result = await calculateUserWorkload('user123', 'TEST');

      expect(result).toBe(0);
    });

    it('should return 0 when no issues are found', async () => {
      const mockResponse = {
        ok: true,
        data: {
          issues: []
        }
      };

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue(mockResponse);

      const result = await calculateUserWorkload('user123', 'TEST');

      expect(result).toBe(0);
    });

    it('should return 0 when data is missing', async () => {
      const mockResponse = {
        ok: true,
        data: null
      };

      (JiraClient.searchIssues as jest.Mock).mockResolvedValue(mockResponse);

      const result = await calculateUserWorkload('user123', 'TEST');

      expect(result).toBe(0);
    });
  });

  describe('escapeJqlText', () => {
    it('should escape backslashes', () => {
      const result = escapeJqlText('test\\value');
      expect(result).toBe('test\\\\value');
    });

    it('should escape double quotes', () => {
      const result = escapeJqlText('test"value');
      expect(result).toBe('test\\"value');
    });

    it('should escape both backslashes and quotes', () => {
      const result = escapeJqlText('test\\"value');
      expect(result).toBe('test\\\\\\"value');
    });

    it('should handle text without special characters', () => {
      const result = escapeJqlText('test value');
      expect(result).toBe('test value');
    });

    it('should handle empty string', () => {
      const result = escapeJqlText('');
      expect(result).toBe('');
    });

    it('should handle multiple quotes', () => {
      const result = escapeJqlText('test "quoted" value');
      expect(result).toBe('test \\"quoted\\" value');
    });
  });
});
