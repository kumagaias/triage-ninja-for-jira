import { classifyTicket, suggestAssignee, findSimilarTickets } from '../rovoAgent';

describe('rovoAgent', () => {
  describe('classifyTicket', () => {
    it('should classify ticket with network keywords', async () => {
      const input = {
        summary: 'VPN connection not working',
        description: 'Cannot connect to VPN from home',
        reporter: 'John Doe',
        created: '2025-12-14T00:00:00.000Z'
      };

      const result = await classifyTicket(input);

      expect(result.category).toBe('Network & Connectivity');
      expect(result.subCategory).toBe('VPN');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should classify ticket with hardware keywords', async () => {
      const input = {
        summary: 'Printer not working',
        description: 'Office printer is offline',
        reporter: 'Jane Smith',
        created: '2025-12-14T00:00:00.000Z'
      };

      const result = await classifyTicket(input);

      expect(result.category).toBe('Hardware');
      expect(result.subCategory).toBe('Printer');
      expect(result.priority).toBeDefined();
    });

    it('should handle urgent tickets', async () => {
      const input = {
        summary: 'URGENT: System down',
        description: 'Critical system failure',
        reporter: 'Admin',
        created: '2025-12-14T00:00:00.000Z'
      };

      const result = await classifyTicket(input);

      expect(result.priority).toBe('High');
      expect(result.urgency).toBe('Urgent');
    });
  });

  describe('suggestAssignee', () => {
    it('should suggest assignee with lowest workload', async () => {
      const input = {
        category: 'Network & Connectivity',
        subCategory: 'VPN',
        availableAgents: [
          { name: 'Agent 1', id: 'agent1', skills: ['network'], currentLoad: 5 },
          { name: 'Agent 2', id: 'agent2', skills: ['network'], currentLoad: 2 },
          { name: 'Agent 3', id: 'agent3', skills: ['network'], currentLoad: 8 }
        ],
        historicalData: []
      };

      const result = await suggestAssignee(input);

      expect(result.assignee).toBe('Agent 2');
      expect(result.assigneeId).toBe('agent2');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle no available agents', async () => {
      const input = {
        category: 'Network & Connectivity',
        subCategory: 'VPN',
        availableAgents: [],
        historicalData: []
      };

      const result = await suggestAssignee(input);

      expect(result.assignee).toBe('Unassigned');
      expect(result.confidence).toBe(0);
    });
  });

  describe('findSimilarTickets', () => {
    it('should find similar tickets based on keywords', async () => {
      const input = {
        currentTicket: {
          summary: 'VPN connection issue',
          description: 'Cannot connect to VPN'
        },
        pastTickets: [
          {
            id: 'TICKET-1',
            summary: 'VPN not working',
            description: 'VPN connection failed',
            resolution: 'Restarted VPN service',
            resolutionTime: '1 hour'
          },
          {
            id: 'TICKET-2',
            summary: 'Printer offline',
            description: 'Printer not responding',
            resolution: 'Restarted printer',
            resolutionTime: '30 minutes'
          }
        ]
      };

      const result = await findSimilarTickets(input);

      expect(result.similarTickets.length).toBeGreaterThan(0);
      expect(result.similarTickets[0].id).toBe('TICKET-1');
      expect(result.suggestedActions).toBeDefined();
    });

    it('should handle no past tickets', async () => {
      const input = {
        currentTicket: {
          summary: 'New issue',
          description: 'Never seen before'
        },
        pastTickets: []
      };

      const result = await findSimilarTickets(input);

      expect(result.similarTickets).toEqual([]);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });
  });
});
