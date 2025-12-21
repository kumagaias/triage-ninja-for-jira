import { metricsTracker } from '../metrics';

describe('MetricsTracker', () => {
  beforeEach(() => {
    // Reset metrics before each test
    metricsTracker.reset();
  });

  describe('trackRovoSuccess', () => {
    it('should increment successful calls', () => {
      metricsTracker.trackRovoSuccess();
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.rovoAgentCalls.total).toBe(1);
      expect(metrics.rovoAgentCalls.successful).toBe(1);
      expect(metrics.rovoAgentCalls.failed).toBe(0);
    });

    it('should track confidence scores', () => {
      metricsTracker.trackRovoSuccess(85);
      metricsTracker.trackRovoSuccess(90);
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.confidenceScores.sum).toBe(175);
      expect(metrics.confidenceScores.count).toBe(2);
    });

    it('should ignore invalid confidence scores', () => {
      metricsTracker.trackRovoSuccess(-10);
      metricsTracker.trackRovoSuccess(150);
      metricsTracker.trackRovoSuccess(undefined);
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.confidenceScores.sum).toBe(0);
      expect(metrics.confidenceScores.count).toBe(0);
    });

    it('should accept confidence scores at boundaries', () => {
      metricsTracker.trackRovoSuccess(0);
      metricsTracker.trackRovoSuccess(100);
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.confidenceScores.sum).toBe(100);
      expect(metrics.confidenceScores.count).toBe(2);
    });
  });

  describe('trackRovoFailure', () => {
    it('should increment failed calls', () => {
      metricsTracker.trackRovoFailure();
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.rovoAgentCalls.total).toBe(1);
      expect(metrics.rovoAgentCalls.successful).toBe(0);
      expect(metrics.rovoAgentCalls.failed).toBe(1);
    });

    it('should track multiple failures', () => {
      metricsTracker.trackRovoFailure();
      metricsTracker.trackRovoFailure();
      metricsTracker.trackRovoFailure();
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.rovoAgentCalls.total).toBe(3);
      expect(metrics.rovoAgentCalls.failed).toBe(3);
    });
  });

  describe('trackFallback', () => {
    it('should track fallback usage', () => {
      metricsTracker.trackFallback('timeout');
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.fallbackUsage.total).toBe(1);
      expect(metrics.fallbackUsage.reasons['timeout']).toBe(1);
    });

    it('should track multiple fallback reasons', () => {
      metricsTracker.trackFallback('timeout');
      metricsTracker.trackFallback('network-error');
      metricsTracker.trackFallback('timeout');
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.fallbackUsage.total).toBe(3);
      expect(metrics.fallbackUsage.reasons['timeout']).toBe(2);
      expect(metrics.fallbackUsage.reasons['network-error']).toBe(1);
    });

    it('should initialize new reason counters', () => {
      metricsTracker.trackFallback('new-reason');
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.fallbackUsage.reasons['new-reason']).toBe(1);
    });
  });

  describe('getSuccessRate', () => {
    it('should return 0 when no calls', () => {
      expect(metricsTracker.getSuccessRate()).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      metricsTracker.trackRovoSuccess();
      metricsTracker.trackRovoSuccess();
      metricsTracker.trackRovoFailure();
      
      expect(metricsTracker.getSuccessRate()).toBeCloseTo(66.67, 1);
    });

    it('should return 100 when all successful', () => {
      metricsTracker.trackRovoSuccess();
      metricsTracker.trackRovoSuccess();
      
      expect(metricsTracker.getSuccessRate()).toBe(100);
    });

    it('should return 0 when all failed', () => {
      metricsTracker.trackRovoFailure();
      metricsTracker.trackRovoFailure();
      
      expect(metricsTracker.getSuccessRate()).toBe(0);
    });
  });

  describe('getFallbackRate', () => {
    it('should return 0 when no calls', () => {
      expect(metricsTracker.getFallbackRate()).toBe(0);
    });

    it('should calculate fallback rate correctly', () => {
      metricsTracker.trackRovoSuccess();
      metricsTracker.trackRovoSuccess();
      metricsTracker.trackRovoFailure();
      metricsTracker.trackFallback('timeout');
      
      // 1 fallback out of 3 total Rovo Agent calls = 33.33%
      expect(metricsTracker.getFallbackRate()).toBeCloseTo(33.33, 1);
    });

    it('should handle only fallback calls', () => {
      metricsTracker.trackFallback('timeout');
      metricsTracker.trackFallback('error');
      
      // No Rovo Agent calls, so rate is 0
      expect(metricsTracker.getFallbackRate()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      metricsTracker.trackRovoSuccess(85);
      metricsTracker.trackRovoFailure();
      metricsTracker.trackFallback('timeout');
      
      metricsTracker.reset();
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.rovoAgentCalls.total).toBe(0);
      expect(metrics.rovoAgentCalls.successful).toBe(0);
      expect(metrics.rovoAgentCalls.failed).toBe(0);
      expect(metrics.fallbackUsage.total).toBe(0);
      expect(metrics.fallbackUsage.reasons).toEqual({});
      expect(metrics.confidenceScores.sum).toBe(0);
      expect(metrics.confidenceScores.count).toBe(0);
    });

    it('should update lastReset timestamp', () => {
      const beforeReset = new Date().toISOString();
      metricsTracker.reset();
      const afterReset = new Date().toISOString();
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.lastReset >= beforeReset).toBe(true);
      expect(metrics.lastReset <= afterReset).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      metricsTracker.trackRovoSuccess(85);
      
      const metrics1 = metricsTracker.getMetrics();
      const metrics2 = metricsTracker.getMetrics();
      
      // Should be different objects
      expect(metrics1).not.toBe(metrics2);
      
      // But with same values
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('logMetrics', () => {
    it('should log metrics without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      metricsTracker.trackRovoSuccess(85);
      metricsTracker.trackRovoFailure();
      metricsTracker.trackFallback('timeout');
      
      metricsTracker.logMetrics();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Metrics] Usage statistics',
        expect.objectContaining({
          rovoAgent: expect.any(Object),
          fallback: expect.any(Object),
          confidence: expect.any(Object)
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should calculate average confidence correctly in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      metricsTracker.trackRovoSuccess(80);
      metricsTracker.trackRovoSuccess(90);
      
      metricsTracker.logMetrics();
      
      const logCall = consoleSpy.mock.calls[0];
      const logData = logCall[1];
      
      expect(logData.confidence.average).toBe('85.00');
      expect(logData.confidence.samples).toBe(2);
      
      consoleSpy.mockRestore();
    });

    it('should handle zero confidence samples', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      metricsTracker.trackRovoSuccess(); // No confidence score
      
      metricsTracker.logMetrics();
      
      const logCall = consoleSpy.mock.calls[0];
      const logData = logCall[1];
      
      expect(logData.confidence.average).toBe('0.00');
      expect(logData.confidence.samples).toBe(0);
      
      consoleSpy.mockRestore();
    });
  });
});
