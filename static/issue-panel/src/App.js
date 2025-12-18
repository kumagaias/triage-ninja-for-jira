import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import { getTranslations } from './i18n';
import './App.css';

// Helper function to get confidence CSS class based on score
const getConfidenceClass = (confidence) => {
  if (confidence >= 80) {
    return 'high';
  } else if (confidence >= 60) {
    return 'medium';
  } else {
    return 'low';
  }
};

/**
 * AI Triage Panel Component
 * Displays AI-powered triage analysis for Jira issues
 */
function App() {
  console.log('[AI Triage] Component mounted');
  
  const [issueDetails, setIssueDetails] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [locale, setLocale] = useState('en');
  
  // Use refs to track timers and prevent race conditions
  const progressIntervalRef = React.useRef(null);
  const timeoutIdRef = React.useRef(null);
  const progressResetTimeoutRef = React.useRef(null);
  const isCancelledRef = React.useRef(false);
  
  const t = getTranslations(locale);

  // Get user locale on mount
  useEffect(() => {
    const getUserLocale = async () => {
      try {
        const context = await view.getContext();
        setLocale(context.locale || 'en');
      } catch (err) {
        console.error('Failed to get user locale:', err);
        setLocale('en');
      }
    };
    
    getUserLocale();
  }, []);

  // Fetch issue details on component mount
  useEffect(() => {
    const fetchIssueDetails = async () => {
      try {
        console.log('[AI Triage] Fetching issue details...');
        const details = await invoke('getIssueDetails');
        console.log('[AI Triage] Issue details loaded:', details);
        setIssueDetails(details);
      } catch (err) {
        console.error('[AI Triage] Failed to fetch issue details:', err);
        setError(t.failedToLoadIssue);
      }
    };
    fetchIssueDetails();
  }, []);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (progressResetTimeoutRef.current) {
        clearTimeout(progressResetTimeoutRef.current);
      }
    };
  }, []);

  // Run AI triage analysis with timeout and progress
  const handleRunTriage = async () => {
    // Defensive check: ensure issueDetails is loaded
    if (!issueDetails) {
      setError(t.issueDetailsNotLoaded);
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    isCancelledRef.current = false;
    
    // Clear any existing timers
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (progressResetTimeoutRef.current) clearTimeout(progressResetTimeoutRef.current);
    
    // Non-linear progress simulation with easing
    // Progress reaches 90% over 27 seconds, leaving 3 seconds buffer
    const startTime = Date.now();
    const duration = 27000; // 27 seconds to reach 90%
    
    progressIntervalRef.current = setInterval(() => {
      if (isCancelledRef.current) {
        clearInterval(progressIntervalRef.current);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      // Ease-out cubic function for smooth deceleration
      const easedRatio = 1 - Math.pow(1 - ratio, 3);
      const newProgress = Math.min(Math.floor(easedRatio * 90), 90);
      
      setProgress(newProgress);
      
      if (newProgress >= 90) {
        clearInterval(progressIntervalRef.current);
      }
    }, 100);
    
    // Timeout after 30 seconds
    timeoutIdRef.current = setTimeout(() => {
      if (isCancelledRef.current) return;
      
      isCancelledRef.current = true;
      clearInterval(progressIntervalRef.current);
      setLoading(false);
      setProgress(0);
      setError(t.analysisTimeout);
    }, 30000);
    
    try {
      // Pass issue details to the AI triage function
      const result = await invoke('runAITriage', {
        issueKey: issueDetails.key,
        summary: issueDetails.summary,
        description: issueDetails.description || '',
        reporter: issueDetails.reporter?.displayName || 'Unknown',
        created: issueDetails.created
      });
      
      // Only process result if not cancelled
      if (!isCancelledRef.current) {
        clearTimeout(timeoutIdRef.current);
        clearInterval(progressIntervalRef.current);
        setProgress(100);
        setTriageResult(result);
        setLoading(false);
        
        // Store timeout ID for cleanup
        progressResetTimeoutRef.current = setTimeout(() => {
          if (!isCancelledRef.current) {
            setProgress(0);
          }
        }, 500);
      }
    } catch (err) {
      // Only show error if not cancelled
      if (!isCancelledRef.current) {
        clearTimeout(timeoutIdRef.current);
        clearInterval(progressIntervalRef.current);
        console.error('Failed to run AI triage:', err);
        setError(t.analysisFailed);
        setLoading(false);
        setProgress(0);
      }
    }
  };

  // Show confirmation dialog
  const handleApproveClick = () => {
    setShowConfirmDialog(true);
  };

  // Handle approve action after confirmation
  const handleApproveConfirm = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    setError(null);
    
    try {
      await invoke('applyTriageResult', {
        issueKey: issueDetails.key,
        priority: triageResult.priority,
        assigneeId: triageResult.suggestedAssignee.id,
        category: triageResult.category,
        subCategory: triageResult.subCategory
      });
      
      // Show success message
      setSuccessMessage({
        priority: triageResult.priority,
        assignee: triageResult.suggestedAssignee.name,
        category: triageResult.category,
        subCategory: triageResult.subCategory
      });
      
      // Clear the result
      setTriageResult(null);
      
      // Reload issue details in the panel
      const details = await invoke('getIssueDetails');
      setIssueDetails(details);
    } catch (err) {
      console.error('Failed to apply triage result:', err);
      setError(t.applyFailed);
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel confirmation dialog
  const handleApproveCancel = () => {
    setShowConfirmDialog(false);
  };

  // Handle reject action
  const handleReject = () => {
    // Clear the triage result and allow user to run again
    setTriageResult(null);
  };

  if (!issueDetails) {
    return (
      <div className="loading-container">
        <div>{t.loadingIssueDetails}</div>
      </div>
    );
  }

  return (
    <div className="ai-triage-container">
      <h2 className="ai-triage-header">
        <span>🥷</span>
        <span>{t.aiTriage}</span>
      </h2>
      
      {!triageResult && (
        <div>
          <div className="status-box">
            <div className="status-label">
              {t.status}:
            </div>
            <div className="status-value">
              {t.notTriaged}
            </div>
          </div>
          <button
            onClick={handleRunTriage}
            disabled={loading}
            className="run-triage-button"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner">⚡</span> {t.analyzing}
              </>
            ) : (
              t.runAITriage
            )}
          </button>
          
          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div className="progress-container">
              <div 
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
                aria-label="Analysis progress"
                className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-text">
                {t.analyzingProgress}... {progress}%
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <div className="success-message-title">
            ✅ {t.triageAppliedSuccess}
          </div>
          <div className="success-message-text">
            {t.issueUpdatedWith}
          </div>
          <ul className="success-message-list">
            <li>{t.priority}: <strong>{successMessage.priority}</strong></li>
            <li>{t.assignee}: <strong>{successMessage.assignee}</strong></li>
            <li>{t.labels}: <strong>{successMessage.category}, {successMessage.subCategory}</strong></li>
          </ul>
          <div className="success-message-note">
            {t.refreshNote}
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="dismiss-button"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {triageResult && (
        <div className="triage-result">
          {/* Confidence Score */}
          <div className={`confidence-box ${getConfidenceClass(triageResult.confidence)}`}>
            <div className="confidence-label">
              {t.confidenceScore}
            </div>
            <div className="confidence-value">
              {triageResult.confidence}%
            </div>
          </div>

          {/* Category */}
          <div className="section">
            <h3 className="section-title">
              📁 {t.category}
            </h3>
            <div className="category-box">
              <span className="category-primary">
                {triageResult.category}
              </span>
              <span className="category-separator">›</span>
              <span className="category-secondary">
                {triageResult.subCategory}
              </span>
            </div>
          </div>

          {/* Priority & Urgency */}
          <div className="section">
            <h3 className="section-title">
              ⚡ {t.priorityAndUrgency}
            </h3>
            <div className="priority-urgency-container">
              <div className="priority-urgency-box">
                <div className="priority-urgency-label">{t.priority}</div>
                <div className="priority-urgency-value">{triageResult.priority}</div>
              </div>
              <div className="priority-urgency-box">
                <div className="priority-urgency-label">{t.urgency}</div>
                <div className="priority-urgency-value">{triageResult.urgency}</div>
              </div>
            </div>
          </div>

          {/* Suggested Assignee */}
          <div className="section">
            <h3 className="section-title">
              👤 {t.suggestedAssignee}
            </h3>
            <div className="assignee-box">
              <div className="assignee-name">
                {triageResult.suggestedAssignee.name}
              </div>
              <div className="assignee-reason">
                ✓ {triageResult.suggestedAssignee.reason}
              </div>
              <div className="assignee-time">
                ⏱️ {t.avgResolution}: {triageResult.suggestedAssignee.estimatedTime}
              </div>
            </div>
          </div>

          {/* Similar Tickets */}
          {triageResult.similarTickets && triageResult.similarTickets.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                🔍 {t.similarTickets} ({triageResult.similarTickets.length})
              </h3>
              {triageResult.similarTickets.slice(0, 3).map((ticket, index) => (
                <div key={index} className="similar-ticket">
                  <div className="similar-ticket-header">
                    {ticket.id} 
                    <span className="similarity-badge">
                      {Math.round(ticket.similarity * 100)}% {t.similar}
                    </span>
                  </div>
                  <div className="similar-ticket-solution">
                    {ticket.solution}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reasoning */}
          {triageResult.reasoning && (
            <div className="section">
              <h3 className="section-title">
                💡 {t.reasoning}
              </h3>
              <div className="reasoning-box">
                {triageResult.reasoning}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons" aria-live="polite">
            <button
              onClick={handleApproveClick}
              disabled={loading}
              className="approve-button"
              aria-busy={loading}
            >
              {loading ? t.applying : t.approveAndApply}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="reject-button"
            >
              {t.reject}
            </button>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && triageResult && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="dialog-overlay">
          <div className="dialog-content">
            <h3 
              id="confirm-dialog-title"
              className="dialog-title">
              {t.confirmTriageApplication}
            </h3>
            <p className="dialog-text">
              {t.confirmApplyChanges}
            </p>
            <ul className="dialog-list">
              <li>{t.priority}: <strong>{triageResult?.priority || 'N/A'}</strong></li>
              <li>{t.assignee}: <strong>{triageResult?.suggestedAssignee?.name || 'N/A'}</strong></li>
              <li>{t.labels}: <strong>{triageResult?.category || 'N/A'}, {triageResult?.subCategory || 'N/A'}</strong></li>
            </ul>
            <div className="dialog-buttons">
              <button
                onClick={handleApproveCancel}
                aria-label="Cancel triage application"
                className="dialog-cancel-button"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleApproveConfirm}
                aria-label="Confirm triage application"
                className="dialog-confirm-button"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
