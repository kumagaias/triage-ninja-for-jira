/**
 * Metrics tracking for Rovo Agent usage
 * Tracks success rates, failures, and performance metrics
 */

interface MetricsData {
  rovoAgentCalls: {
    total: number;
    successful: number;
    failed: number;
  };
  fallbackUsage: {
    total: number;
    reasons: Record<string, number>;
  };
  confidenceScores: {
    sum: number;
    count: number;
  };
  lastReset: string;
}

class MetricsTracker {
  private metrics: MetricsData;
  private logInterval: number = 3600000; // 1 hour in milliseconds
  private lastLogTime: number = Date.now();

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): MetricsData {
    return {
      rovoAgentCalls: {
        total: 0,
        successful: 0,
        failed: 0
      },
      fallbackUsage: {
        total: 0,
        reasons: {}
      },
      confidenceScores: {
        sum: 0,
        count: 0
      },
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Track a successful Rovo Agent call
   */
  trackRovoSuccess(confidence?: number): void {
    this.metrics.rovoAgentCalls.total++;
    this.metrics.rovoAgentCalls.successful++;

    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 100) {
      this.metrics.confidenceScores.sum += confidence;
      this.metrics.confidenceScores.count++;
    }

    this.checkAndLogMetrics();
  }

  /**
   * Track a failed Rovo Agent call
   */
  trackRovoFailure(): void {
    this.metrics.rovoAgentCalls.total++;
    this.metrics.rovoAgentCalls.failed++;
    this.checkAndLogMetrics();
  }

  /**
   * Track fallback usage
   */
  trackFallback(reason: string): void {
    this.metrics.fallbackUsage.total++;
    
    if (!this.metrics.fallbackUsage.reasons[reason]) {
      this.metrics.fallbackUsage.reasons[reason] = 0;
    }
    this.metrics.fallbackUsage.reasons[reason]++;
    
    this.checkAndLogMetrics();
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.metrics.rovoAgentCalls.total === 0) {
      return 0;
    }
    return (this.metrics.rovoAgentCalls.successful / this.metrics.rovoAgentCalls.total) * 100;
  }

  /**
   * Get fallback rate as percentage
   * Defined as: (number of calls that used fallback) / (total Rovo Agent calls)
   */
  getFallbackRate(): number {
    const totalCalls = this.metrics.rovoAgentCalls.total;
    if (totalCalls === 0) {
      return 0;
    }
    return (this.metrics.fallbackUsage.total / totalCalls) * 100;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.lastLogTime = Date.now();
    console.log('[Metrics] Metrics reset', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if it's time to log metrics and log if needed
   */
  private checkAndLogMetrics(): void {
    const now = Date.now();
    if (now - this.lastLogTime >= this.logInterval) {
      this.logMetrics();
      this.lastLogTime = now;
    }
  }

  /**
   * Log current metrics
   */
  logMetrics(): void {
    const timestamp = new Date().toISOString();
    const successRate = this.getSuccessRate();
    const fallbackRate = this.getFallbackRate();
    const averageConfidence = this.metrics.confidenceScores.count > 0
      ? this.metrics.confidenceScores.sum / this.metrics.confidenceScores.count
      : 0;

    console.log('[Metrics] Usage statistics', {
      timestamp,
      period: {
        start: this.metrics.lastReset,
        end: timestamp
      },
      rovoAgent: {
        totalCalls: this.metrics.rovoAgentCalls.total,
        successful: this.metrics.rovoAgentCalls.successful,
        failed: this.metrics.rovoAgentCalls.failed,
        successRate: `${successRate.toFixed(2)}%`
      },
      fallback: {
        totalUsage: this.metrics.fallbackUsage.total,
        fallbackRate: `${fallbackRate.toFixed(2)}%`,
        reasons: this.metrics.fallbackUsage.reasons
      },
      confidence: {
        average: averageConfidence.toFixed(2),
        samples: this.metrics.confidenceScores.count
      }
    });
  }
}

// Export singleton instance
export const metricsTracker = new MetricsTracker();
